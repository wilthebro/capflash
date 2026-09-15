import type { RenderSpec } from '@captioner/shared';

export interface RenderStatus {
  status: 'queued' | 'running' | 'done' | 'error';
  progress: number;
  error?: string;
}

export interface HealthStatus {
  ok: boolean;
  ffmpeg: { found: boolean; version: string; libass: boolean; whisper: boolean };
}

/**
 * What the server can actually do. The server route only chooses the export
 * engine when its ffmpeg is present AND built with libass — without libass there
 * is no `ass` filter, so it cannot burn captions in at all.
 */
export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`Health request failed (${res.status})`);
  return (await res.json()) as HealthStatus;
}

export async function startRender(spec: RenderSpec, videoFile: File): Promise<string> {
  const fd = new FormData();
  fd.append('spec', JSON.stringify(spec));
  fd.append('video', videoFile, videoFile.name);
  const res = await fetch('/api/render', { method: 'POST', body: fd });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Render request failed (${res.status})`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function getRenderStatus(id: string): Promise<RenderStatus> {
  const res = await fetch(`/api/render/${id}/status`);
  if (!res.ok) throw new Error(`Status request failed (${res.status})`);
  return (await res.json()) as RenderStatus;
}

export function renderDownloadUrl(id: string): string {
  return `/api/render/${id}/download`;
}
