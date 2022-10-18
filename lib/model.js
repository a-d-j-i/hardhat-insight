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

function sumSlots(members, space = "") {
  let slots = 0;
  let s = 0;
  for (const m of members) {
    if (m.nodeType === "ElementaryTypeName") {
      const name = m.typeDescriptions.typeString;
      if (name.startsWith("uint")) {
        const bits = parseInt(name.substring(4));
        s += bits;
        if (s > 256) {
          slots++;
          s = bits;
        }
      } else {
        throw new Error("Invalid type" + name);
      }
    } else if (m.nodeType === "ArrayTypeName") {
      const baseSlots = sumSlots([m.baseType], space + " ");
      if (s > 0) {
        slots++;
        s = 0;
      }
      if (m.length) {
        slots += baseSlots * parseInt(m.length.value);
      } else {
        slots++;
      }
    } else {
      throw new Error("Invalid type" + m);
    }
  }
  if (s > 0) {
    slots++;
  }
  return slots;
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
        const vars = []
        travelAst(depth + 1, node, (d, n) => {
          if (n.nodeType === 'StructDefinition') {
            structs[n.id] = {
              name: n.name,
              slots: sumSlots(n.members.map(x => x.typeName)),
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
  let slot = 0;
  for (const x of mainContract.linearizedBaseContracts.reverse()) {
    for (const y of contractDefinitions[x].vars) {
      let offset = 0;
      ret.push({
        astId: y.id,
        contract: contractDefinitions[x].fullName,
        label: y.name,
        offset,
        slot: slot.toString(),
        type: y.typeDescriptions.typeIdentifier
          .split("_$").join(")")
          .split("$_").join("(")
          .split(")_").join(","),
      })
      if (structs[y.typeName.referencedDeclaration]) {
        slot += structs[y.typeName.referencedDeclaration].slots;
      } else {
        slot++;
      }
    }
  }
  return ret;
}

module.exports = {processContract, processContractStorage, sumSlots}
