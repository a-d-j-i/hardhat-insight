/*
  Task to generate different versions of the template contracts for testing
 */
const fs = require('fs');
const path = require('path');
const {
  TASK_COMPILE,
} = require('hardhat/builtin-tasks/task-names');
task(TASK_COMPILE)
  .setAction(async function (args, hre, runSuper) {
    const templateDir = path.resolve(hre.config.paths.root, "tasks", "template");
    const outDir = path.resolve(hre.config.paths.sources);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir);
    }
    const versions = hre.config.solidity.compilers.map(x => x.version);
    for (const version of versions) {
      const outDir = path.resolve(hre.config.paths.sources, version);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir);
      }
      const files = fs.readdirSync(templateDir)
        .map(x => x.trim()).filter(x => x.endsWith(".sol"));
      for (const file of files) {
        const inFile = path.join(templateDir, file);
        const outFile = path.join(outDir, file)
        const moreThan7 = parseInt(version.split(".")[1]) >= 7;
        const data = fs.readFileSync(inFile, 'utf8')
          .replace(/___compilerVersion___/g, version)
          .replace(/___constructorVisibility___/g,
            moreThan7 ? "" : "public")
          .split("\n")
          .filter(x => !x.trim().startsWith("//>7") || moreThan7)
          .map(x => x.trim().startsWith("//>7") ? x.trim().slice(4) : x)
          .join("\n");
        fs.writeFileSync(outFile, data, 'utf8');
      }
    }
    await runSuper();
  })

