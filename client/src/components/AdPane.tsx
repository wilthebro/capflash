import { useEffect, useRef } from 'react';
import { ADS_ENABLED, AD_PROVIDER } from '../ads/config';
import { useAdRotation } from '../hooks/useAdRotation';

/**
 * The right-hand ad rail. Owns the slot element the provider mounts into, and
 * disposes the previous ad before each rotation so nothing accumulates behind
 * it. The mount effect depends only on the provider and the rotation counter —
 * subscribing to anything else here would put a component that re-renders at
 * frame rate into the tree.
 */
export function AdPane() {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const rotation = useAdRotation(AD_PROVIDER.rotates);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const mounted = AD_PROVIDER.mount(slot, { slot: 'sidebar', rotation });
    return () => mounted?.dispose();
  }, [rotation]);

  if (!ADS_ENABLED) return null;

  return (
    <aside className="ad-pane">
      <span className="ad-chip">{AD_PROVIDER.label}</span>
      <div className="ad-slot" ref={slotRef} data-ad-provider={AD_PROVIDER.id} />
    </aside>
  );
}
