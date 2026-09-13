import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { RenderSpecSchema, type RenderSpec } from '@captioner/shared';
import { JOBS_DIR, MAX_VIDEO_BYTES } from '../config';
import { createJob, getJob, setJob } from '../lib/jobs';
import { getRenderer } from '../lib/renderers/types';

export const renderRouter = Router();

const stagingDir = path.join(JOBS_DIR, 'staging');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdir(stagingDir, { recursive: true }).then(
        () => cb(null, stagingDir),
        (err) => cb(err, stagingDir),
      );
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
});

renderRouter.post('/', upload.single('video'), async (req, res) => {
  const staged = req.file;
  if (!staged) {
    res.status(400).json({ error: 'No video file uploaded' });
    return;
  }

  let spec: RenderSpec;
  try {
    const raw = String(req.body?.spec ?? '');
    const parsed = RenderSpecSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid render spec',
        details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).slice(0, 20),
      });
      return;
    }
    spec = parsed.data;
  } catch (err) {
    await fs.rm(staged.path, { force: true });
    res.status(400).json({
      error: err instanceof SyntaxError ? 'spec is not valid JSON' : err instanceof Error ? err.message : 'Invalid spec',
    });
    return;
  }

  const ext = path.extname(staged.originalname).toLowerCase() || '.mp4';
  const job = createJob({
    inputPath: '',
    outputPath: '',
    assPath: '',
    fontsDir: '',
    outputFileName: `captioned-${Date.now()}.mp4`,
  });
  const jobDir = path.join(JOBS_DIR, job.id);
  const inputPath = path.join(jobDir, `input${ext}`);
  setJob(job.id, {
    inputPath,
    outputPath: path.join(jobDir, 'output.mp4'),
    assPath: path.join(jobDir, 'captions.ass'),
    fontsDir: path.join(jobDir, 'fonts'),
  });

  try {
    await fs.mkdir(jobDir, { recursive: true });
    await fs.rename(staged.path, inputPath);
  } catch (err) {
    await fs.rm(staged.path, { force: true });
    res.status(500).json({ error: 'Failed to store uploaded video' });
    return;
  }

  void runRender(job.id, spec);
  res.json({ id: job.id });
});

renderRouter.get('/:id/status', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Unknown job id' });
    return;
  }
  res.json({ status: job.status, progress: job.progress, error: job.error });
});

renderRouter.get('/:id/download', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Unknown job id' });
    return;
  }
  if (job.status !== 'done') {
    res.status(409).json({ error: `Job not done (status: ${job.status})` });
    return;
  }
  res.download(job.outputPath, job.outputFileName, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Output file missing' });
  });
});

async function runRender(id: string, spec: RenderSpec): Promise<void> {
  const job = getJob(id);
  if (!job) return;
  const renderer = getRenderer(spec.renderer);
  setJob(id, { status: 'running' });
  try {
    if (!renderer) throw new Error(`No renderer registered for '${spec.renderer}'`);
    await renderer.render({
      job,
      spec,
      onProgress: (p) => setJob(id, { progress: p }),
    });
    setJob(id, { status: 'done', progress: 1, completedAt: Date.now() });
  } catch (err) {
    setJob(id, { status: 'error', error: err instanceof Error ? err.message : String(err) });
  }
}
