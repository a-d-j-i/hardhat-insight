const {
  normalizeCompilerOutputBytecode,
  getLibraryAddressPositions
} = require("hardhat/internal/hardhat-network/stack-traces/library-utils");
const {populateAst, travelAst} = require("./astHelper");
const {decodeInstructions, uncompressSourcemaps} = require("./instructionHelper");


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

module.exports = {processContract}
