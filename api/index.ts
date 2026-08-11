// This file acts as the Vercel Serverless Function entrypoint.
// It imports the Express app from our server file.
import express from 'express';
// We need to extract the app setup from server.ts to be exportable.
// Since server.ts is currently wrapping everything in startServer(),
// we can just require the compiled dist/server.cjs in production on Vercel!
