function travelAst(depth, node, todo) {
  const ret = todo(depth, node);
  if (node.nodes) {
    const nodes = [];
    for (let a of node.nodes) {
      nodes.push(travelAst(depth + 1, a, todo));
    }
    if (ret) ret.nodes = nodes;
  }
  if (node.body) {
    const body = travelAst(depth + 1, node.body, todo);
    if (ret) ret.body = body;
  }
  if (node.expression) {
    const expression = travelAst(depth + 1, node.expression, todo);
    if (ret) ret.expression = expression;
  }
  if (node.statements) {
    const statements = [];
    for (let a of node.statements) {
      statements.push(travelAst(depth + 1, a, todo));
    }
    if (ret) ret.statements = statements;
  }
  return ret;
}

function populateAst(fullAst, missing, instructions) {
  for (let i = 0; i < instructions.length; i++) {
    const instruction = instructions[i];
    if (!instructions[i].sourceMap) {
      fullAst[-2].ast.instructions.push(instruction);
      continue;
    }
    const location = instructions[i].sourceMap.location;
    const pos = location.offset;
    if (!fullAst[location.file]) {
      missing[location.file] = true; // print just once
      fullAst[-3].ast.instructions.push(instruction);
      continue;
    }
    fullAst[location.file].touched = true;
    let added = false;
    travelAst(0, fullAst[location.file].ast, (depth, node) => {
      if (!node.start || !node.end || (pos >= node.start && pos <= node.end)) {
        added = true;
        node.instructions.push(instruction);
      }
    });
    if (!added) {
      console.log("INSTRUCTION NOT ADDED-->", instruction);
    }
  }
}

module.exports = {travelAst, populateAst}
