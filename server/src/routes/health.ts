import { Router } from 'express';
import { probeFfmpeg } from '../lib/ffmpeg';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  res.json({ ok: true, ffmpeg: await probeFfmpeg() });
});
