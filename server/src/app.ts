import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { healthRouter } from './routes/health';
import { renderRouter } from './routes/render';
import './lib/renderers/assRenderer'; // register renderers on import

export function createApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use('/api/health', healthRouter);
  app.use('/api/render', renderRouter);

  // Multipart/upload errors (e.g. file too large) as JSON instead of HTML.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  });

  // Serve the built client in production (dev runs Vite separately).
  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
  return app;
}
