const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove `async function startServer() {`
code = code.replace(/async function startServer\(\) {\n/g, '');

// 2. We need to find `// Vite middleware for development` and replace everything after it.
const viteIndex = code.indexOf('// Vite middleware for development');
if (viteIndex !== -1) {
  const newEndCode = `
// Vite setup and Start Server
async function setupViteAndStart() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Vite not available");
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    if (!process.env.VERCEL) {
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on port \${PORT}\`);
    });
  }
}
setupViteAndStart();
export default app;
`;
  code = code.substring(0, viteIndex) + newEndCode;
}

fs.writeFileSync('server.ts', code);
console.log('Regex fixed server.ts');
