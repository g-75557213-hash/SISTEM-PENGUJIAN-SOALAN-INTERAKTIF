const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Remove `async function startServer() {` and its closing bracket.
code = code.replace(/async function startServer\(\) {\n/g, '');

// We need to fix the Vite middleware which has `await`
const viteCode = `  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on port \${PORT}\`);
    });
  }
}
startServer();`;

// Replace the end part with an async IIFE for Vite and listening
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
    // For Vercel, we don't handle the SPA fallback in Express because Vercel rewrites handles it.
    // We only need this if running locally in production mode.
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
`;

code = code.replace(viteCode, newEndCode);

fs.writeFileSync('server.ts', code);
console.log('Made server.ts synchronous');
