// api/backend/[...path].js
// Vercel @vercel/node catch-all entry point.
// Imports the Express app and re-exports it as the serverless handler.
// Vercel manages the HTTP listener — no server.listen() needed here.
module.exports = require('../../backend/app');
