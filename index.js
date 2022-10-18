const {TASK_COMPILE} = require('hardhat/builtin-tasks/task-names');
const {printContract} = require("./lib/view");
const {processContract, getAst, sumSlots, processContractStorage} = require("./lib/model");

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

task('storage', 'Print the storage structure of a set of contracts')
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
      const storage = processContractStorage(fullName, buildInfo);
      console.log("----------------->", fullName);
      console.log(["slot", "label".padEnd(30), "type"].join("\t"))
      for (const s of storage) {
        console.log([s.slot,s.label.padEnd(30), s.type].join("\t"))
      }
    }
  })
