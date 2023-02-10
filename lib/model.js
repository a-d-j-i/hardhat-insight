const {
  normalizeCompilerOutputBytecode,
  getLibraryAddressPositions
} = require("hardhat/internal/hardhat-network/stack-traces/library-utils");
const {populateAst, travelAst} = require("./astHelper");
const {decodeInstructions, uncompressSourcemaps} = require("./instructionHelper");


function cloneAst(ast, fields) {
  // Clone AST and add some values.
  return travelAst(0, ast, (depth, node) => {
    const ret = {
      instructions: [],
    };
    // clone some props
    fields.forEach(
      (x) => (ret[x] = node[x])
    );
    // if (node.nodeType === "VariableDeclaration") {
    //   console.log(node)
    // }
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

function getAst(buildInfo, fields) {
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
      ast: cloneAst(data.ast, fields),
    };
  }
  return fullAst;
}

function addGeneratedSources(fullAst, generatedSources, fields) {
  if (generatedSources) {
    for (const g of generatedSources) {
      fullAst[g.id] = {
        sourceName: g.name,
        id: g.id,
        code: g.contents,
        ast: cloneAst(g.ast, fields),
      }
    }
  }
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


function processContractInsight(fullName, buildInfo) {
  // Search current contract bytecode and add instructions to AST
  const {deployedBytecode, generatedSources} = findCurrentContractOutput(buildInfo, fullName);
  if (!deployedBytecode) {
    return;
  }
  const normalizedCode = normalizeCompilerOutputBytecode(
    deployedBytecode.object,
    getLibraryAddressPositions(deployedBytecode)
  );
  const instructions = decodeInstructions(deployedBytecode, normalizedCode);
  const fields = ['id', 'nodeType', 'name', 'kind', 'absolutePath', 'src'];
  const fullAst = getAst(buildInfo, fields);
  addGeneratedSources(fullAst, generatedSources, fields);
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

function structSlots(structs, v) {
  if (v.referencedDeclaration) {
    return structs[v.referencedDeclaration].slots;
  }
  if (v.nodeType === "ArrayTypeName" && v.length) {
    return processVars(structs, [v.baseType]) * parseInt(v.length.value);
  }
  return 1;
}

function processVars(structs, vars, add) {
  let slot = 0;
  let offset = 0;
  let s = 0;
  for (const v of vars) {
    if (v.constant) {
      continue;
    }
    // Can be packed
    if (v.nodeType === "ElementaryTypeName" || v.nodeType === "UserDefinedTypeName") {
      const name = v.typeDescriptions.typeString;
      if (name === "address" || name.startsWith("contract") || name.startsWith("uint")) {
        const bits = name === "address" || name.startsWith("contract") ? 160 : parseInt(name.substring(4));
        add && add(v, slot, offset);
        s += bits;
        if (s < 256) {
          offset += bits / 8;
        } else {
          offset = 0;
          slot++;
          if (s === 256) {
            s = 0;
          } else {
            s = bits;
          }
        }
        continue;
      }
    }
    // !packed
    offset = 0;
    if (s > 0) {
      slot++;
    }
    s = 0;
    add && add(v, slot, offset);
    slot += structSlots(structs, v);
  }
  if (s > 0) {
    slot++;
  }
  return slot;
}


function processContractStorage(fullName, buildInfo) {
  const fields = ['id', 'nodeType', 'name', 'kind', 'absolutePath',
    'exportedSymbols',
    'linearizedBaseContracts', 'members',
    'stateVariable', 'storageLocation', 'typeDescriptions', 'typeName', 'typeDescriptions', 'visibility',
    'constant', 'mutability', 'overrides', 'value'
  ];
  const fullAst = getAst(buildInfo, fields);
  const contractDefinitions = {};
  let mainContractDefinitionId = -1;
  const structs = {}
  for (const id in fullAst) {
    const data = fullAst[id];
    if (id < 0) {
      // skip internal and unknown, printed later
      continue;
    }
    // Find the main contract
    travelAst(0, data.ast, (depth, node) => {
      if (node.nodeType === 'ContractDefinition') {
        // Interface declaration == address
        structs[node.id] = {
          name: node.name,
          slots: 1,
          members: []
        };
        const vars = []
        travelAst(depth + 1, node, (d, n) => {
          if (n.nodeType === 'StructDefinition') {
            structs[n.id] = {
              name: n.name,
              slots: processVars(structs, n.members.map(x => x.typeName)),
              members: n.members.map(x => x.typeName.typeDescriptions.typeString + " " + x.name)
            };
          }
          if (n.nodeType === 'VariableDeclaration') {
            vars.push(n);
          }
        })
        if (fullName === data.ast.absolutePath + ":" + node.name) {
          mainContractDefinitionId = node.id;
        }
        // TODO: Calculate storage using structs and vars
        contractDefinitions[node.id] = {
          fullName,
          name: node.name,
          linearizedBaseContracts: node.linearizedBaseContracts,
          vars
        };
      }
    })
  }
  const mainContract = contractDefinitions[mainContractDefinitionId];
  const ret = [];
  const vars = [];
  for (const x of mainContract.linearizedBaseContracts.reverse()) {
    for (const y of contractDefinitions[x].vars) {
      vars.push({
        astId: y.id,
        contract: contractDefinitions[x].fullName,
        label: y.name,
        type: y.typeDescriptions.typeIdentifier
          .split("_$").join(")")
          .split("$_").join("(")
          .split(")_").join(","),
        constant: y.constant,
        ...y.typeName
      });
    }
  }
  processVars(structs, vars, (v, slot, offset) => {
      ret.push({
        astId: v.astId,
        contract: v.contract,
        label: v.label,
        type: v.type,
        offset: offset,
        slot: slot.toString(),
      });
    }
  );
  return ret;
}

module.exports = {processContractInsight, processContractStorage, sumSlots: (vars, add) => processVars({}, vars, add)}
