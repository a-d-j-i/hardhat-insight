const {TASK_COMPILE} = require('hardhat/builtin-tasks/task-names');
const {
  isJump,
  isPush,
  getPushLength,
} = require('hardhat/internal/hardhat-network/stack-traces/opcodes');
const {
  getLibraryAddressPositions,
  normalizeCompilerOutputBytecode,
} = require('hardhat/internal/hardhat-network/stack-traces/library-utils');

function decodeOpcodes(opcodes) {
  const strs = opcodes.trim().split(' ');
  const ret = [];
  for (let i = 0; i < strs.length; i++) {
    if (strs[i].startsWith('PUSH')) {
      ret.push(strs[i] + ' ' + strs[i + 1]);
      i++;
    } else {
      ret.push(strs[i]);
    }
  }
  return ret;
}

function uncompressSourcemaps(compressedSourcemap) {
  const mappings = [
    {
      jumpType: '-',
      modifierDepth: 0,
      location: {
        file: -1,
        offset: 0,
        length: 0,
      },
    },
  ];

  function checkPart(p, d) {
    return p !== undefined && p !== '' ? +p : d;
  }

  const compressedMappings = compressedSourcemap.split(';');
  for (let i = 0; i < compressedMappings.length; i++) {
    const parts = compressedMappings[i].split(':');
    mappings.push({
      location: {
        offset: checkPart(parts[0], mappings[i].location.offset),
        length: checkPart(parts[1], mappings[i].location.length),
        file: checkPart(parts[2], mappings[i].location.file),
      },
      modifierDepth: checkPart(parts[4], mappings[i].modifierDepth),
      jumpType:
        parts[3] !== undefined && parts[3] !== ''
          ? parts[3]
          : mappings[i].jumpType,
    });
  }
  mappings.shift();
  return mappings;
}

function decodeInstructions(normalizedCode) {
  const instructions = [];
  for (let pc = 0, idx = 0; pc < normalizedCode.length; pc++, idx++) {
    const opcode = normalizedCode[pc];
    if (isPush(opcode)) {
      const length = getPushLength(opcode);
      instructions.push({
        pc,
        idx,
        opcode,
        jumpType: false,
        pushData: normalizedCode.slice(pc + 1, pc + 1 + length),
        bytes: normalizedCode.slice(pc, pc + 1 + length),
        size: 1 + length,
      });
      pc += length;
    } else {
      instructions.push({
        pc,
        idx,
        opcode,
        bytes: normalizedCode.slice(pc, pc + 1),
        jumpType: isJump(opcode),
        size: 1,
      });
    }
  }
  return instructions;
}

function travelAst(depth, node, todo) {
  const ret = todo(depth, node);
  if (node.nodes) {
    const nodes = [];
    for (let a of node.nodes) {
      nodes.push(travelAst(depth + 1, a, todo));
    }
    if (ret) ret.nodes = nodes;
  }
  if (node.body) {
    const body = travelAst(depth + 1, node.body, todo);
    if (ret) ret.body = body;
  }
  if (node.expression) {
    const expression = travelAst(depth + 1, node.expression, todo);
    if (ret) ret.expression = expression;
  }
  if (node.statements) {
    const statements = [];
    for (let a of node.statements) {
      statements.push(travelAst(depth + 1, a, todo));
    }
    if (ret) ret.statements = statements;
  }
  return ret;
}

function findCurrentContractOutput(buildInfo, fullName) {
  let contractId = -1;
  let bytecode;
  for (const sourceName in buildInfo.output.contracts) {
    for (const source in buildInfo.output.contracts[sourceName]) {
      if (fullName !== sourceName + ':' + source) {
        continue;
      }
      const data = buildInfo.output.contracts[sourceName][source];
      // console.log('generatedSources->', data.evm.bytecode.generatedSources);
      // This is an abstract contract
      if (data.evm.bytecode.object === '') {
        continue;
      }
      if (contractId > 0) {
        console.error('Repeated contract', fullName, sourceName, source);
        return;
      }
      contractId = buildInfo.output.sources[sourceName].id;
      bytecode = data.evm.deployedBytecode;
    }
  }
  return {contractId, bytecode};
}

function getAst(buildInfo) {
  const internalCode = (id) => ({
    id,
    sourceName: 'internal',
    ast: {instructions: []},
    code: {},
  });
  const fullAst = {
    '-1': internalCode(-1),
    '-2': internalCode(-2),
    '-3': internalCode(-3),
  };
  for (const sourceName in buildInfo.output.sources) {
    const data = buildInfo.output.sources[sourceName];
    // Clone AST and add some values.
    const ast = travelAst(0, data.ast, (depth, node) => {
      const ret = {
        instructions: [],
      };
      // clone some props
      ['id', 'nodeType', 'name', 'absolutePath', 'src'].forEach(
        (x) => (ret[x] = node[x])
      );
      if (node.src) {
        const sourceMap = uncompressSourcemaps(node.src);
        if (sourceMap.length !== 1) {
          console.error('INVALID SOURCE MAP FOR A NODE', node.src);
        }
        if (sourceMap.length > 0) {
          ret.sourceMap = sourceMap;
          ret.start = sourceMap[0].location.offset;
          ret.end = sourceMap[0].location.offset + sourceMap[0].location.length;
        }
      }
      return ret;
    });
    fullAst[data.id] = {
      sourceName,
      id: data.id,
      code: buildInfo.input.sources[sourceName].content,
      ast,
    };
  }
  return fullAst;
}

function processContract(fullName, buildInfo) {
  // Search current contract bytecode and add instructions to AST
  const {bytecode} = findCurrentContractOutput(buildInfo, fullName);
  if (!bytecode) {
    return;
  }
  const libraryAddressPositions = getLibraryAddressPositions(bytecode);
  const normalizedCode = normalizeCompilerOutputBytecode(
    bytecode.object,
    libraryAddressPositions
  );
  const instructions = decodeInstructions(normalizedCode);
  // Add source map to instructions
  const sourceMap = uncompressSourcemaps(bytecode.sourceMap);
  for (let i = 0; i < sourceMap.length; i++) {
    instructions[i].sourceMap = sourceMap[i];
  }
  // Add opcodes to instructions
  const opcodes = decodeOpcodes(bytecode.opcodes);
  for (let i = 0; i < opcodes.length; i++) {
    instructions[i].str = opcodes[i];
  }
  // Populate AST with instructions
  const fullAst = getAst(buildInfo);
  const missing = {};
  for (let i = 0; i < instructions.length; i++) {
    const instruction = instructions[i];
    if (!instructions[i].sourceMap) {
      fullAst[-2].ast.instructions.push(instruction);
      continue;
    }
    const location = instructions[i].sourceMap.location;
    const pos = location.offset;
    //  TODO: Why, fix this !!!
    if (!fullAst[location.file]) {
      missing[location.file] = true; // print just once
      fullAst[-3].ast.instructions.push(instruction);
      continue;
    }
    fullAst[location.file].touched = true;
    travelAst(0, fullAst[location.file].ast, (depth, node) => {
      if (!node.start || !node.end || (pos >= node.start && pos <= node.end)) {
        node.instructions.push(instruction);
      }
    });
  }
  return {
    fullName,
    instructions,
    fullAst,
    normalizedCode,
    missing: Object.keys(missing),
  };
}

// eslint-disable-next-line no-inner-declarations
function printSource(spacer, sourceMap, fileIdToSourceFile) {
  for (let i = 0; i < sourceMap.length; i++) {
    const s = sourceMap[i];
    const fileSource = fileIdToSourceFile[s.location.file];
    if (!fileSource) {
      console.log(spacer, 'SOURCE NOT FOUND', i, s);
    } else {
      console.log(
        fileSource.code
          .substring(s.location.offset, s.location.offset + s.location.length)
          .split('\n')
          .map((x) => spacer + x)
          .join('\n')
      );
    }
  }
}

function printInstruction(spacer, instructions) {
  for (let i of instructions) {
    console.log(
      spacer,
      i.idx,
      'pc',
      i.pc,
      'opcode',
      '(',
      i.opcode.toString(16),
      ') ',
      i.str,
      'size',
      i.size,
      ...(i.sourceMap && i.sourceMap.location
        ? [
            'location file',
            i.sourceMap.location.file,
            'offset',
            i.sourceMap.location.offset,
            'length',
            i.sourceMap.location.length,
          ]
        : [])
    );
  }
}

const sum = (a) => a.reduce((acc, val) => acc + val.size, 0);

function printContract({
  fullName,
  instructions,
  fullAst,
  normalizedCode,
  missing,
}) {
  console.log(
    '----------------------------',
    fullName,
    'bytecode size',
    normalizedCode.length,
    'instructions',
    instructions.length
  );
  // console.log('INSTRUCTIONS');
  // printInstruction('    ', instructions);
  // console.log('----------------------------');
  for (const id in fullAst) {
    const data = fullAst[id];
    if (id < 0 || !data.touched) {
      // skip internal and unknown, printed later
      continue;
    }
    travelAst(0, data.ast, (depth, node) => {
      const spacer = ' '.repeat(depth * 4);
      const txt = [
        spacer,
        node.absolutePath,
        // 'Node id',
        // node.id,
        // node.name,
        'type',
        node.nodeType,
        // 'location',
        // node.src,
      ]
        .filter((x) => !!x)
        .join(' ');
      const size = node.instructions ? sum(node.instructions) : 0;
      const instr = node.instructions ? node.instructions.length : 0;
      if (size > 0 || instr > 0) {
        const txt2 = 'instructions: ' + instr;
        console.log(
          txt,
          ' '.repeat(120 - txt.length),
          txt2,
          ' '.repeat(20 - txt2.length),
          'size: ' + size
        );
      }
      //printInstruction(spacer, node.instructions);
      if (
        (node.nodeType === 'FunctionDefinition' ||
          node.nodeType === 'VariableDeclaration') &&
        node.sourceMap
      ) {
        printSource(spacer + '    ', node.sourceMap, fullAst);
      }
    });
  }
  console.log('----------------------------');
  const internal = fullAst[-1].ast.instructions;
  console.log('internal/shared code (no file)');
  console.log('cant', internal.length, 'total size:', sum(internal));
  // printInstruction('    ', internal);
  const unknown = fullAst[-2].ast.instructions;
  console.log('unknown (no source map)');
  console.log('cant', unknown.length, 'total size:', sum(unknown));
  // printInstruction('    ', unknown);
  const notFound = fullAst[-3].ast.instructions;
  console.log('notFound (strange), Missing ids:', missing.join(' '));
  console.log('cant', notFound.length, 'total size:', sum(notFound));
  // printInstruction('    ', notFound);
  console.log('END ----------------------------', fullName);
}

task('insight', 'Print info about the contracts')
  .addFlag('nocompile', "Don't compile before running this task")
  .addOptionalParam('only', 'Print only those that matches')
  .addOptionalParam('except', 'Skip those that matches')
  .setAction(async function (args, hre) {
    if (!args.nocompile) {
      await hre.run(TASK_COMPILE, {noSizeContracts: true});
    }
    const fullNames = await hre.artifacts.getAllFullyQualifiedNames();
    // eslint-disable-next-line no-undef
    const only =
      args.only && Array.isArray(args.only) ? args.only : [args.only];
    const except =
      args.except && Array.isArray(args.except) ? args.except : [args.except];
    for (const fullName of fullNames) {
      if (args.only && !only.some((m) => fullName.match(m))) {
        continue;
      }
      if (args.except && except.some((m) => fullName.match(m))) {
        continue;
      }
      const buildInfo = await hre.artifacts.getBuildInfo(fullName);
      const contractData = processContract(fullName, buildInfo);
      if (contractData) {
        printContract(contractData);
      } else {
        console.log(fullName, 'is abstract, no bytecode');
      }
    }
  });
