const hre = require("hardhat");
const assert = require("assert");
const {processContract} = require("../lib/model");

describe("Hardhat insight test", function () {
  ["0.4", "0.5", "0.6", "0.7", "0.8"].forEach(version =>
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
    })
  )
});
