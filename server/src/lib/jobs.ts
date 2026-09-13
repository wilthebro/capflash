import { randomUUID } from 'node:crypto';

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface RenderJob {
  id: string;
  status: JobStatus;
  progress: number; // 0..1
  error?: string;
  inputPath: string;
  outputPath: string;
  assPath: string;
  fontsDir: string;
  outputFileName: string;
  createdAt: number;
  completedAt?: number;
}

const jobs = new Map<string, RenderJob>();

/** Jobs live in memory only — renders are transient artifacts on disk. */
export function createJob(fields: Omit<RenderJob, 'id' | 'status' | 'progress' | 'createdAt'>): RenderJob {
  const job: RenderJob = {
    ...fields,
    id: randomUUID(),
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): RenderJob | undefined {
  return jobs.get(id);
}

export function setJob(id: string, patch: Partial<RenderJob>): void {
  const job = jobs.get(id);
  if (job) Object.assign(job, patch);
}
