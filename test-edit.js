const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We want to export `app` instead of just calling listen.
// Let's modify the end of startServer.
// From:
//   app.listen(PORT, "0.0.0.0", () => {
//     console.log(`Server running on port ${PORT}`);
//   });
// }
// startServer();
// To:
//   if (process.env.VERCEL) {
//     return app;
//   }
//   app.listen(PORT, "0.0.0.0", () => {
//     console.log(`Server running on port ${PORT}`);
//   });
// }
// 
// export default startServer();
// 

