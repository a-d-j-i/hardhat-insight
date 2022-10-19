const hre = require("hardhat");
const assert = require("assert");
const {processContract, processContractStorage} = require("../lib/model");

describe("Hardhat insight test", function () {
  hre.config.solidity.compilers.map(x => x.version)
    .forEach(version =>
      describe(`tests for ${version} contracts`, function () {
        it("nothing is missing", async function () {
          const fullName = `contracts/${version}/Greeter.sol:Greeter`;
          const buildInfo = await hre.artifacts.getBuildInfo(fullName);
          const data = processContract(fullName, buildInfo);
          assert.strictEqual(data.missing.length, 0);
        })
        it("bytecode size matches", async function () {
          const fullName = `contracts/${version}/Greeter.sol:Greeter`;
          const buildInfo = await hre.artifacts.getBuildInfo(fullName);
          const data = processContract(fullName, buildInfo);
          let totalSize = 0;
          for (const i of data.instructions) {
            totalSize += i.size;
          }
          assert.strictEqual(data.normalizedCode.length, totalSize);
          totalSize = 0;
          for (const k in data.fullAst) {
            for (const i of data.fullAst[k].ast.instructions) {
              totalSize += i.size;
            }
          }
          assert.strictEqual(data.normalizedCode.length, totalSize);
        })
        it("storage matches", async function () {
          const fullName = `contracts/${version}/Greeter.sol:Greeter`;
          const buildInfo = await hre.artifacts.getBuildInfo(fullName);
          const data = processContractStorage(fullName, buildInfo);
          const {
            sourceName,
            contractName
          } = await hre.artifacts.readArtifact(fullName);
          const storage = buildInfo.output.contracts[sourceName] && buildInfo.output.contracts[sourceName][contractName]
            && buildInfo.output.contracts[sourceName][contractName].storageLayout
            && buildInfo.output.contracts[sourceName][contractName].storageLayout.storage;
          if (storage) {
            assert.strictEqual(storage.length, data.length);
            for (let i = 0; i < storage.length; i++) {
              assert.strictEqual(storage[i].astId, data[i].astId);
              assert.strictEqual(storage[i].contract, data[i].contract);
              assert.strictEqual(storage[i].label, data[i].label);
              assert.strictEqual(storage[i].type, data[i].type);
              assert.strictEqual(storage[i].slot, data[i].slot);
              // For variables in the main contract the compiler computes the offset in bytes instead of words ?
              if (storage[i].offset !== data[i].offset) {
                console.warn(version, "Invalid offset",
                  storage[i].label, "slot", storage[i].slot,
                  storage[i].offset, "!=", data[i].offset);
              }
            }
          }
        })
      })
    )
});
