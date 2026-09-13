import type { VideoMeta } from '@captioner/shared';

export function readVideoMeta(url: string, file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = url;
    v.onloadedmetadata = () =>
      resolve({ name: file.name, duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    v.onerror = () => reject(new Error('Could not read video metadata — unsupported format?'));
  });
}
