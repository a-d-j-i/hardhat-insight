const {TASK_COMPILE} = require('hardhat/builtin-tasks/task-names');
const {printContractStorage, printContractInsight} = require("./lib/view");
const {processContractInsight, processContractStorage} = require("./lib/model");

task('insight', 'Print the size in bytes of each contract method, assembly and raw gas estimate')
  .addFlag('nocompile', "Don't compile before running this task")
  .addFlag('asm', 'Print assembly instructions')
  .addFlag('gas', 'Print gas estimate')
  .addFlag('all', 'Print everything, even the lines of code that have size == 0')
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
    const contractData = {};
    for (const fullName of fullNames) {
      if (args.only && !only.some((m) => fullName.match(m))) {
        continue;
      }
      if (args.except && except.some((m) => fullName.match(m))) {
        continue;
      }
      const buildInfo = await hre.artifacts.getBuildInfo(fullName);
      contractData[fullName] = processContractInsight(fullName, buildInfo);
    }
    printContractInsight(console.log, contractData, args);
  });

task('checkStorage', 'Print the storage slots of a set of contracts')
  .addFlag('nocompile', "Don't compile before running this task")
  .addOptionalParam('only', 'Print only those that matches')
  .addOptionalParam('except', 'Skip those that matches')
  .addFlag('all', 'Print everything, even slots that matches')
  .setAction(async function (args, hre) {
    if (!args.nocompile) {
      await hre.run(TASK_COMPILE, {noSizeContracts: true});
    }
    const fullNames = await hre.artifacts.getAllFullyQualifiedNames();
    // eslint-disable-next-line no-undef
    const only =
      [].concat(...(args.only && Array.isArray(args.only) ? args.only : [args.only]).map(x => x.split(",")));
    const except =
      args.except && Array.isArray(args.except) ? args.except : [args.except];
    const contractData = {};
    for (const fullName of fullNames) {
      if (args.only && !only.some((m) => fullName.match(m))) {
        continue;
      }
      if (args.except && except.some((m) => fullName.match(m))) {
        continue;
      }
      const buildInfo = await hre.artifacts.getBuildInfo(fullName);
      contractData[fullName] = processContractStorage(fullName, buildInfo);
    }
    printContractStorage(console.log, contractData, args);
  })
