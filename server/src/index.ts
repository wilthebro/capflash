import { promises as fs } from 'node:fs';
import { createApp } from './app';
import { JOBS_DIR, PORT } from './config';
import { probeFfmpeg } from './lib/ffmpeg';

async function main(): Promise<void> {
  await fs.mkdir(JOBS_DIR, { recursive: true });
  const ff = await probeFfmpeg();
  if (!ff.found) {
    console.error('WARNING: ffmpeg not found on PATH — export will fail.');
  } else if (!ff.libass) {
    console.error('WARNING: this ffmpeg build lacks libass — export will fail.');
  }
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`captioner server listening on http://localhost:${PORT}`);
    console.log(
      `ffmpeg: ${ff.found ? ff.version : 'NOT FOUND'}${ff.libass ? ' (libass OK)' : ' (NO libass!)'}`,
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
