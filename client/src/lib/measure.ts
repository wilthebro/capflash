let ctx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D {
  if (!ctx) {
    const canvas = document.createElement('canvas');
    const c = canvas.getContext('2d');
    if (!c) throw new Error('2D canvas not available');
    ctx = c;
  }
  return ctx;
}

// Cache is invalidated when fonts load or change (clearMeasureCache).
const cache = new Map<string, number>();

/** Measure text width in px for the given family/size (same engine that renders the preview DOM). */
export function measureText(text: string, fontFamily: string, fontSize: number): number {
  const key = `${fontFamily}|${fontSize}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const c = getMeasureCtx();
  c.font = `${fontSize}px "${fontFamily}"`;
  const w = c.measureText(text).width;
  cache.set(key, w);
  return w;
}

export function clearMeasureCache(): void {
  cache.clear();
}
