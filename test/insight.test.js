const hre = require("hardhat");
const {processContract} = require("../tasks/insight");
const assert = require("assert");

describe("Hardhat insight test", function () {
  it("process contracts", async function () {
    const fullName = "contracts/0.4/Greeter.sol:Greeter";
    const buildInfo = await hre.artifacts.getBuildInfo(fullName);
    const data = await processContract(fullName, buildInfo);
    assert.strictEqual(data.missing.length,0);
  });

});
