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

function dissasemble(instruction) {
  // based on: https://ethereum.org/en/developers/docs/evm/opcodes/
  const assembly = {
    0: {name: 'STOP', gas: 0},
    1: {name: 'ADD', gas: 3},
    2: {name: 'MUL', gas: 5},
    3: {name: 'SUB', gas: 3},
    4: {name: 'DIV', gas: 5},
    5: {name: 'SDIV', gas: 5},
    6: {name: 'MOD', gas: 5},
    7: {name: 'SMOD', gas: 5},
    8: {name: 'ADDMOD', gas: 8},
    9: {name: 'MULMOD', gas: 8},
    10: {name: 'EXP', gas: 10, estimate: 50 * 2}, // 10 + 50 * byte_len_exponent
    11: {name: 'SIGNEXTEND', gas: 5},
    16: {name: 'LT', gas: 3},
    17: {name: 'GT', gas: 3},
    18: {name: 'SLT', gas: 3},
    19: {name: 'SGT', gas: 3},
    20: {name: 'EQ', gas: 3},
    21: {name: 'ISZERO', gas: 3},
    22: {name: 'AND', gas: 3},
    23: {name: 'OR', gas: 3},
    24: {name: 'XOR', gas: 3},
    25: {name: 'NOT', gas: 3},
    26: {name: 'BYTE', gas: 3},
    27: {name: 'SHL', gas: 3},
    28: {name: 'SHR', gas: 3},
    29: {name: 'SAR', gas: 3},
    32: {name: 'SHA3', gas: 30, estimate: 6 * 10}, // 30 + 6 * data_size_words + mem_expansion_cost
    48: {name: 'ADDRESS', gas: 2},
    49: {name: 'BALANCE', gas: 100, estimate: 2500}, // touched = 100, not touched = 2600
    50: {name: 'ORIGIN', gas: 2},
    51: {name: 'CALLER', gas: 2},
    52: {name: 'CALLVALUE', gas: 2},
    53: {name: 'CALLDATALOAD', gas: 3},
    54: {name: 'CALLDATASIZE', gas: 2},
    55: {name: 'CALLDATACOPY', gas: 3, estimate: 1024 * 3}, // 3 + 3 * data_size_words + mem_expansion_cost
    56: {name: 'CODESIZE', gas: 2},
    57: {name: 'CODECOPY', gas: 3, estimate: 256 * 3}, // 3 + 3 * data_size_words + mem_expansion_cost
    58: {name: 'GASPRICE', gas: 2},
    59: {name: 'EXTCODESIZE', gas: 100, estimate: 2500}, // touched = 100, not touched = 2600
    60: {name: 'EXTCODECOPY', gas: 100, estimate: 2500 + 1024 * 3}, // access_cost + 3 * data_size_words + mem_expansion_cost
    61: {name: 'RETURNDATASIZE', gas: 2},
    62: {name: 'RETURNDATACOPY', gas: 3, estimate: 256 * 3}, // 3 + 3 * data_size_words + mem_expansion_cost
    63: {name: 'EXTCODEHASH', gas: 100, estimate: 2500}, // touched = 100, not touched = 2600
    64: {name: 'BLOCKHASH', gas: 2},
    65: {name: 'COINBASE', gas: 2},
    66: {name: 'TIMESTAMP', gas: 2},
    67: {name: 'NUMBER', gas: 2},
    68: {name: 'DIFFICULTY', gas: 2},
    69: {name: 'GASLIMIT', gas: 2},
    70: {name: 'CHAINID', gas: 2},
    71: {name: 'SELFBALANCE', gas: 5},
    72: {name: 'BASEFEE', gas: 2},
    80: {name: 'POP', gas: 2},
    81: {name: 'MLOAD', gas: 3},
    82: {name: 'MSTORE', gas: 3},
    83: {name: 'MSTORE8', gas: 3},
    84: {name: 'SLOAD', gas: 100, estimate: 2100},
    85: {name: 'SSTORE', gas: 100, estimate: 20000},
    86: {name: 'JUMP', gas: 8},
    87: {name: 'JUMPI', gas: 1},
    88: {name: 'PC', gas: 2},
    89: {name: 'MSIZE', gas: 2},
    90: {name: 'GAS', gas: 2},
    91: {name: 'JUMPDEST', gas: 1},
    96: {name: 'PUSH1', gas: 3},
    97: {name: 'PUSH2', gas: 3},
    98: {name: 'PUSH3', gas: 3},
    99: {name: 'PUSH4', gas: 3},
    100: {name: 'PUSH5', gas: 3},
    101: {name: 'PUSH6', gas: 3},
    102: {name: 'PUSH7', gas: 3},
    103: {name: 'PUSH8', gas: 3},
    104: {name: 'PUSH9', gas: 3},
    105: {name: 'PUSH10', gas: 3},
    106: {name: 'PUSH11', gas: 3},
    107: {name: 'PUSH12', gas: 3},
    108: {name: 'PUSH13', gas: 3},
    109: {name: 'PUSH14', gas: 3},
    110: {name: 'PUSH15', gas: 3},
    111: {name: 'PUSH16', gas: 3},
    112: {name: 'PUSH17', gas: 3},
    113: {name: 'PUSH18', gas: 3},
    114: {name: 'PUSH19', gas: 3},
    115: {name: 'PUSH20', gas: 3},
    116: {name: 'PUSH21', gas: 3},
    117: {name: 'PUSH22', gas: 3},
    118: {name: 'PUSH23', gas: 3},
    119: {name: 'PUSH24', gas: 3},
    120: {name: 'PUSH25', gas: 3},
    121: {name: 'PUSH26', gas: 3},
    122: {name: 'PUSH27', gas: 3},
    123: {name: 'PUSH28', gas: 3},
    124: {name: 'PUSH29', gas: 3},
    125: {name: 'PUSH30', gas: 3},
    126: {name: 'PUSH31', gas: 3},
    127: {name: 'PUSH32', gas: 3},
    128: {name: 'DUP1', gas: 3},
    129: {name: 'DUP2', gas: 3},
    130: {name: 'DUP3', gas: 3},
    131: {name: 'DUP4', gas: 3},
    132: {name: 'DUP5', gas: 3},
    133: {name: 'DUP6', gas: 3},
    134: {name: 'DUP7', gas: 3},
    135: {name: 'DUP8', gas: 3},
    136: {name: 'DUP9', gas: 3},
    137: {name: 'DUP10', gas: 3},
    138: {name: 'DUP11', gas: 3},
    139: {name: 'DUP12', gas: 3},
    140: {name: 'DUP13', gas: 3},
    141: {name: 'DUP14', gas: 3},
    142: {name: 'DUP15', gas: 3},
    143: {name: 'DUP16', gas: 3},
    144: {name: 'SWAP1', gas: 3},
    145: {name: 'SWAP2', gas: 3},
    146: {name: 'SWAP3', gas: 3},
    147: {name: 'SWAP4', gas: 3},
    148: {name: 'SWAP5', gas: 3},
    149: {name: 'SWAP6', gas: 3},
    150: {name: 'SWAP7', gas: 3},
    151: {name: 'SWAP8', gas: 3},
    152: {name: 'SWAP9', gas: 3},
    153: {name: 'SWAP10', gas: 3},
    154: {name: 'SWAP11', gas: 3},
    155: {name: 'SWAP12', gas: 3},
    156: {name: 'SWAP13', gas: 3},
    157: {name: 'SWAP14', gas: 3},
    158: {name: 'SWAP15', gas: 3},
    159: {name: 'SWAP16', gas: 3},
    160: {name: 'LOG0', gas: 375, estimate: 8 * 32}, // 375 + 375 * num_topics + 8 * data_size + mem_expansion_cost
    161: {name: 'LOG1', gas: 375, estimate: 375 + 8 * 32}, // 375 + 375 * num_topics + 8 * data_size + mem_expansion_cost
    162: {name: 'LOG2', gas: 375, estimate: 375 * 2 + 8 * 32}, // 375 + 375 * num_topics + 8 * data_size + mem_expansion_cost
    163: {name: 'LOG3', gas: 375, estimate: 375 * 3 + 8 * 32}, // 375 + 375 * num_topics + 8 * data_size + mem_expansion_cost
    164: {name: 'LOG4', gas: 375, estimate: 375 * 4 + 8 * 32}, // 375 + 375 * num_topics + 8 * data_size + mem_expansion_cost
    240: {name: 'CREATE', gas: 32000, estimate: 12000 * 200}, // 32000 + mem_expansion_cost + code_deposit_cost
    241: {name: 'CALL', gas: 32000, estimate: 12000 * 200}, // 32000 + 6 * data_size_words + mem_expansion_cost + code_deposit_cost
    242: {name: 'CALLCODE', gas: 100, estimate: 2500}, //  base_gas + gas_sent_with_call
    243: {name: 'RETURN', gas: 0},
    244: {name: 'DELEGATECALL', gas: 100, estimate: 2500}, //  base_gas + gas_sent_with_call
    245: {name: 'CREATE2', gas: 32000, estimate: 12000 * 200}, //  32000 + 6 * data_size_words + mem_expansion_cost + code_deposit_cost
    250: {name: 'STATICCALL', gas: 100, estimate: 2500}, //  base_gas + gas_sent_with_call
    253: {name: 'REVERT', gas: 0},
    255: {name: 'SELFDESTRUCT', gas: 0},
  };
  return assembly[instruction];
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

function decodeInstructions(bytecode, normalizedCode) {
  const instructions = [];
  for (let pc = 0, idx = 0; pc < normalizedCode.length; pc++, idx++) {
    const opcode = normalizedCode[pc];
    if (isPush(opcode)) {
      const length = getPushLength(opcode);
      // OBS: pc + 1 + length can be greater than normalizedCode.length (when we disassemble invalid code)
      const bytes = normalizedCode.slice(pc, pc + 1 + length);
      instructions.push({
        pc,
        idx,
        opcode,
        jumpType: false,
        pushData: bytes.slice(1, bytes.length),
        bytes,
        size: bytes.length,
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
        asm: dissasemble(opcode),
      });
    }
  }
  // Add source map to instructions
  const sourceMap = uncompressSourcemaps(bytecode.sourceMap);
  for (let i = 0; i < sourceMap.length; i++) {
    instructions[i].sourceMap = sourceMap[i];
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
  let ret;
  for (const sourceName in buildInfo.output.contracts) {
    for (const source in buildInfo.output.contracts[sourceName]) {
      if (fullName !== sourceName + ':' + source) {
        continue;
      }
      const data = buildInfo.output.contracts[sourceName][source];
      // This is an abstract contract
      if (data.evm.bytecode.object === '') {
        continue;
      }
      if (contractId > 0) {
        console.error('Repeated contract', fullName, sourceName, source);
        return;
      }
      contractId = buildInfo.output.sources[sourceName].id;
      ret = {
        deployedBytecode: data.evm.deployedBytecode,
        bytecode: data.evm.bytecode,
        generatedSources: data.evm.bytecode.generatedSources
      }
    }
  }
  return {contractId, ...ret};
}

function cloneAst(ast) {
  // Clone AST and add some values.
  return travelAst(0, ast, (depth, node) => {
    const ret = {
      instructions: [],
    };
    // clone some props
    ['id', 'nodeType', 'name', 'kind', 'absolutePath', 'src'].forEach(
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
}

function getAst(buildInfo, generatedSources) {
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
    fullAst[data.id] = {
      sourceName,
      id: data.id,
      code: buildInfo.input.sources[sourceName].content,
      ast: cloneAst(data.ast),
    };
  }
  if (generatedSources) {
    for (const g of generatedSources) {
      fullAst[g.id] = {
        sourceName: g.name,
        id: g.id,
        code: g.contents,
        ast: cloneAst(g.ast),
      }
    }
  }
  return fullAst;
}

function populateAst(fullAst, missing, instructions) {
  for (let i = 0; i < instructions.length; i++) {
    const instruction = instructions[i];
    if (!instructions[i].sourceMap) {
      fullAst[-2].ast.instructions.push(instruction);
      continue;
    }
    const location = instructions[i].sourceMap.location;
    const pos = location.offset;
    if (!fullAst[location.file]) {
      missing[location.file] = true; // print just once
      fullAst[-3].ast.instructions.push(instruction);
      continue;
    }
    fullAst[location.file].touched = true;
    let added = false;
    travelAst(0, fullAst[location.file].ast, (depth, node) => {
      if (!node.start || !node.end || (pos >= node.start && pos <= node.end)) {
        added = true;
        node.instructions.push(instruction);
      }
    });
    if (!added) {
      console.log("INSTRUCTION NOT ADDED-->", instruction);
    }
  }
}

function processContract(fullName, buildInfo) {
  // Search current contract bytecode and add instructions to AST
  const {deployedBytecode, bytecode, generatedSources} = findCurrentContractOutput(buildInfo, fullName);
  if (!deployedBytecode) {
    return;
  }
  const normalizedCode = normalizeCompilerOutputBytecode(
    deployedBytecode.object,
    getLibraryAddressPositions(deployedBytecode)
  );
  const instructions = decodeInstructions(deployedBytecode, normalizedCode);
  const fullAst = getAst(buildInfo, generatedSources);
  const missing = {};
  populateAst(fullAst, missing, instructions)
  return {
    fullName,
    instructions,
    fullAst,
    normalizedCode,
    missing: Object.keys(missing),
  };
}

// eslint-disable-next-line no-inner-declarations
function printSource(log, spacer, sourceMap, fileIdToSourceFile) {
  for (let i = 0; i < sourceMap.length; i++) {
    const s = sourceMap[i];
    const fileSource = fileIdToSourceFile[s.location.file];
    if (!fileSource) {
      log(spacer, 'SOURCE NOT FOUND', i, s);
    } else {
      log(
        fileSource.code
          .substring(s.location.offset, s.location.offset + s.location.length)
          .split('\n')
          .map((x) => spacer + x)
          .join('\n')
      );
    }
  }
}

function printAsm(log, spacer, instructions) {
  for (let i of instructions) {
    log(
      spacer,
      i.idx,
      'pc',
      i.pc,
      'opcode',
      '(',
      i.opcode.toString(16).padStart(2),
      ') ',
      i.asm && i.asm.name ? i.asm.name : "INVALID",
      'size',
      i.size,
      ...(i.sourceMap && i.sourceMap.location && i.sourceMap.location >= 0
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

function printContract(
  log,
  {fullName, instructions, fullAst, normalizedCode, missing},
  options
) {
  const withAsm = !!options.asm;
  const withGas = !!options.gas;
  const full = !!options.full;
  log(
    '----------------------------',
    fullName,
    'bytecode size',
    normalizedCode.length,
    'instructions',
    instructions.length
  );
  if (withAsm) {
    log('INSTRUCTIONS');
    printAsm(log, '    ', instructions);
    log('----------------------------');
  }
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
        'type',
        node.nodeType,
        node.name || node.kind,
        // 'Node id',
        // node.id,
        // 'location',
        // node.src,
      ]
        .filter((x) => !!x)
        .join(' ');
      const size = node.instructions ? sum(node.instructions) : 0;
      const gasSum = node.instructions
        ? node.instructions
          .filter((i) => i.asm)
          .reduce(
            (acc, val) =>
              acc + val.asm.gas + (val.asm.estimate ? val.asm.estimate : 0),
            0
          )
        : 0;
      const instr = node.instructions ? node.instructions.length : 0;
      if (full || size > 0 || instr > 0) {
        const txt2 = 'instructions: ' + instr;
        log(
          ...[
            txt,
            ' '.repeat(Math.max(2, 120 - txt.length)),
            txt2,
            ' '.repeat(Math.max(2, 20 - txt2.length)),
            'size: ' + size,
            withGas && 'gas estimate: ' + gasSum,
          ].filter((x) => !!x)
        );
      }
      if (full || size > 0) {
        const excluded = [
          'SourceUnit',
          'ImportDirective',
          'PragmaDirective',
          'ContractDefinition',
          'FunctionDefinition',
          'YulFunctionDefinition',
        ];
        if (!excluded.includes(node.nodeType) && node.sourceMap) {
          printSource(log, spacer + '    ', node.sourceMap, fullAst);
        }
      }
      if (withAsm) {
        printAsm(log, spacer, node.instructions);
      }
    });
  }
  log('----------------------------');
  const internal = fullAst[-1].ast.instructions;
  log('Internal/shared code (with no corresponding file)');
  log('Cant', internal.length, 'total size:', sum(internal));
  if (withAsm) {
    printAsm(log, '    ', internal);
  }
  const unknown = fullAst[-2].ast.instructions;
  log('Unknown (no source map)');
  log('Cant', unknown.length, 'total size:', sum(unknown));
  if (withAsm) {
    printAsm(log, '    ', unknown);
  }
  const notFound = fullAst[-3].ast.instructions;
  if (notFound.length > 0) {
    log('NotFound (strange), Missing ids:', missing.join(' '));
    log('Cant', notFound.length, 'total size:', sum(notFound));
    if (withAsm) {
      printAsm(log, '    ', notFound);
    }
  }
  log('END ----------------------------', fullName);
}

task('insight', 'Print info about the contracts')
  .addFlag('nocompile', "Don't compile before running this task")
  .addFlag('asm', 'Print assembly instructions')
  .addFlag('gas', 'Print gas estimate')
  .addFlag('full', 'Print everything, event the lines of code that have size == 0')
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
      const log = console.log;
      if (contractData) {
        printContract(log, contractData, args);
      } else {
        log(fullName, 'is abstract, no bytecode');
      }
    }
  });

module.exports = {processContract}
