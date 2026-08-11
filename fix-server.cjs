const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Change `const app = express();` to `const app = express(); export { app };`
// Wait, `app` is defined inside `async function startServer() {`
// Let's move `const app = express();` outside the function.

let newCode = code.replace(
  /async function startServer\(\) {\n  const app = express\(\);/g,
  "export const app = express();\nasync function startServer() {"
);

// We also need to conditionally call `app.listen()`
newCode = newCode.replace(
  /app\.listen\(PORT, "0\.0\.0\.0", \(\) => {\n    console\.log\(`Server running on port \$\{PORT\}`\);\n  }\);/g,
  "if (!process.env.VERCEL) {\n    app.listen(PORT, \"0.0.0.0\", () => {\n      console.log(`Server running on port ${PORT}`);\n    });\n  }"
);

fs.writeFileSync('server.ts', newCode);
console.log('Modified server.ts for Vercel');
