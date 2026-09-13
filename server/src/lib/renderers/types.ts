import type { RenderSpec } from '@captioner/shared';
import type { RenderJob } from '../jobs';

export interface RenderContext {
  job: RenderJob;
  spec: RenderSpec;
  onProgress: (progress: number) => void; // 0..1
}

/**
 * Renderer seam. The ASS renderer is v1; a headless-Chrome PNG-overlay
 * renderer (pixel-perfect with the preview) can register here later without
 * touching the API.
 */
export interface Renderer {
  id: string;
  render(ctx: RenderContext): Promise<void>;
}

const registry = new Map<string, Renderer>();

export function registerRenderer(r: Renderer): void {
  registry.set(r.id, r);
}

export function getRenderer(id: string): Renderer | undefined {
  return registry.get(id);
}
