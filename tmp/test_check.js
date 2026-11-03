const fs = require("fs");
const ts = require("typescript");

const content = fs.readFileSync("./src/App.tsx", "utf8");
const sourceFile = ts.createSourceFile("App.tsx", content, ts.ScriptTarget.Latest, true);

let appsScriptCodeVal = "";
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.text === "appsScriptCode") {
    if (ts.isTemplateExpression(node.initializer)) {
      let s = node.initializer.head.text;
      for (const span of node.initializer.templateSpans) {
        s += "DUMMY_VAR";
        s += span.literal.text;
      }
      appsScriptCodeVal = s;
    }
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);

fs.writeFileSync("/tmp/CodeExtracted.js", appsScriptCodeVal);
console.log("Saved /tmp/CodeExtracted.js");

const vm = require("vm");
try {
  new vm.Script(appsScriptCodeVal);
  console.log("SUCCESS: appsScriptCode is 100% valid JavaScript syntax!");
} catch (e) {
  console.error("FAIL: " + e.message);
  const match = e.stack.match(/evalmachine\.<anonymous>:(\d+)/);
  if (match) {
    const line = parseInt(match[1]);
    const lines = appsScriptCodeVal.split("\n");
    console.error("At line " + line + ": " + lines[line - 1]);
    console.error("Prev line " + (line - 1) + ": " + lines[line - 2]);
    console.error("Next line " + (line + 1) + ": " + lines[line]);
  } else {
    console.error(e.stack);
  }
}
