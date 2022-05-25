const {travelAst} = require("./astHelper");

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


module.exports = {printContract}
