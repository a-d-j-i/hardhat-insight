const hre = require("hardhat");
const assert = require("assert");
const {processContractInsight, processContractStorage} = require("../lib/model");

describe("Hardhat insight test", function () {
  ["Greeter", "Greeter2", "FxTest"]
    .forEach(contract => {
      hre.config.solidity.compilers.map(x => x.version)
        .forEach(version =>
          describe(`tests for ${contract} ${version} contracts`, function () {
            it("nothing is missing", async function () {
              const fullName = `contracts/${version}/${contract}.sol:${contract}`;
              const buildInfo = await hre.artifacts.getBuildInfo(fullName);
              const data = processContractInsight(fullName, buildInfo);
              assert.strictEqual(data.missing.length, 0);
            })
            it("bytecode size matches", async function () {
              const fullName = `contracts/${version}/${contract}.sol:${contract}`;
              const buildInfo = await hre.artifacts.getBuildInfo(fullName);
              const data = processContractInsight(fullName, buildInfo);
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
              const fullName = `contracts/${version}/${contract}.sol:${contract}`;
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
                  assert.strictEqual(storage[i].astId, data[i].astId, "invalid astId " + i);
                  assert.strictEqual(storage[i].contract, data[i].contract, "invalid contract " + i);
                  assert.strictEqual(storage[i].label, data[i].label, "invalid label " + i);
                  assert.strictEqual(storage[i].type, data[i].type, "invalid type " + i);
                  assert.strictEqual(storage[i].slot, data[i].slot, "invalid slot " + i);
                  assert.strictEqual(storage[i].offset, data[i].offset, "invalid offset " + i);
                }
              }
            })
          })
        )
    });
});
