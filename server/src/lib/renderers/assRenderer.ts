import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { generateAss } from '@captioner/shared';
import { buildAssFilter, FFMPEG_BIN } from '../ffmpeg';
import { registerRenderer, type RenderContext, type Renderer } from './types';

const LOG_TAIL = 20;

/** Burn captions via the ffmpeg libass `ass` filter (single pass). */
class AssRenderer implements Renderer {
  id = 'ass';

  async render(ctx: RenderContext): Promise<void> {
    const { job, spec, onProgress } = ctx;

    // 1. Materialize uploaded fonts so libass can resolve them via fontsdir.
    await fs.mkdir(job.fontsDir, { recursive: true });
    for (const font of spec.fonts) {
      if (font.dataBase64) {
        await fs.writeFile(path.join(job.fontsDir, font.fileName), Buffer.from(font.dataBase64, 'base64'));
      }
    }

    // 2. Emit the ASS document (geometry fully resolved client-side).
    await fs.mkdir(path.dirname(job.assPath), { recursive: true });
    await fs.writeFile(job.assPath, generateAss(spec), 'utf8');

    // 3. Run ffmpeg.
    const args = [
      '-y',
      '-hide_banner',
      '-nostdin',
      '-i',
      job.inputPath,
      '-map',
      '0:v',
      '-map',
      '0:a?',
      '-vf',
      buildAssFilter(job.assPath, job.fontsDir),
      '-c:v',
      spec.output.videoCodec,
      '-preset',
      spec.output.preset,
      '-crf',
      String(spec.output.crf),
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      spec.output.audioCodec,
      '-b:a',
      spec.output.audioBitrate,
      '-movflags',
      '+faststart',
      '-progress',
      'pipe:1',
      '-nostats',
      job.outputPath,
    ];
    await this.runFfmpeg(args, spec.video.duration, onProgress);
  }

  private runFfmpeg(
    args: string[],
    duration: number,
    onProgress: (p: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(FFMPEG_BIN, args);
      const logTail: string[] = [];

      // -progress pipe:1 emits key=value lines on stdout.
      let outBuf = '';
      proc.stdout.setEncoding('utf8');
      proc.stdout.on('data', (chunk: string) => {
        outBuf += chunk;
        let nl: number;
        while ((nl = outBuf.indexOf('\n')) >= 0) {
          const line = outBuf.slice(0, nl).trim();
          outBuf = outBuf.slice(nl + 1);
          if (!line) continue;
          const eq = line.indexOf('=');
          const key = eq >= 0 ? line.slice(0, eq) : line;
          const value = eq >= 0 ? line.slice(eq + 1) : '';
          if (key === 'out_time_ms' || key === 'out_time_us') {
            const us = key === 'out_time_ms' ? Number(value) * 1000 : Number(value);
            if (duration > 0 && Number.isFinite(us) && us > 0) {
              onProgress(Math.min(1, us / 1e6 / duration));
            }
          }
        }
      });

      let errBuf = '';
      proc.stderr.setEncoding('utf8');
      proc.stderr.on('data', (chunk: string) => {
        errBuf += chunk;
        let nl: number;
        while ((nl = errBuf.indexOf('\n')) >= 0) {
          const line = errBuf.slice(0, nl).trimEnd();
          errBuf = errBuf.slice(nl + 1);
          if (line) {
            logTail.push(line);
            if (logTail.length > LOG_TAIL) logTail.shift();
          }
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
      });
      proc.on('close', (code) => {
        if (code === 0) {
          onProgress(1);
          resolve();
        } else {
          const tail = logTail.slice(-LOG_TAIL).join('\n');
          reject(new Error(tail || `ffmpeg exited with code ${code}`));
        }
      });
    });
  }
}

registerRenderer(new AssRenderer());
