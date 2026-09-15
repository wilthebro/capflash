import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { SLIDES } from '../site/carousel';

const INTERVAL_MS = 5000;

/**
 * The hero visual: a carousel of whatever is in `src/assets/carousel/`, or the
 * CSS illustration the page shipped with when that folder is empty.
 *
 * The two states live in one component rather than a branch in the page, so the
 * hero is never an empty box and adding the first image is the only thing that
 * has to happen to switch it over.
 *
 * The movement is held back in every way that matters. It stops while the
 * pointer is over it, while the keyboard is inside it, and while the tab is in
 * the background; it never starts at all when the reader has asked for reduced
 * motion; and it can be stopped outright. The pause button is not decoration —
 * WCAG 2.2.2 asks for a mechanism to stop content that updates on its own, and
 * hovering is not something a keyboard can do.
 *
 * Only the first slide loads eagerly. Everything else waits, which is most of
 * what keeps a carousel from costing more than it is worth.
 */
export function HeroCarousel() {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [backgrounded, setBackgrounded] = useState(false);
  const count = SLIDES.length;

  useEffect(() => {
    const onVisibility = () => setBackgrounded(document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const running = count > 1 && !reducedMotion && !stopped && !hovered && !focused && !backgrounded;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [running, count]);

  if (count === 0) return <Fallback />;

  return (
    <div
      className="site-carousel"
      role="group"
      aria-roledescription="carousel"
      aria-label="Examples of caption styles"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      <div className="site-carousel-frame">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.url}
            className={`site-carousel-slide${i === index ? ' is-active' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
          >
            {/* No width/height: the frame's aspect-ratio reserves the space, so
                there is nothing to shift, and the images may be any size. */}
            <img
              src={slide.url}
              alt={slide.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              decoding="async"
            />
          </div>
        ))}
      </div>

      <div className="site-carousel-controls">
        <div className="site-carousel-dots">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.url}
              type="button"
              className={`site-carousel-dot${i === index ? ' is-active' : ''}`}
              aria-label={`Show slide ${i + 1} of ${count}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="site-carousel-toggle"
          aria-label={stopped ? 'Play the slideshow' : 'Pause the slideshow'}
          onClick={() => setStopped((s) => !s)}
        >
          {stopped ? 'Play' : 'Pause'}
        </button>
      </div>
    </div>
  );
}

/**
 * The illustration that was in the hero before there were slides. It draws a
 * caption box and a slice of timeline in CSS — no image weight, and it recolours
 * with the brand like everything else here.
 */
function Fallback() {
  return (
    <div className="site-mock" aria-hidden="true">
      <div className="site-mock-box">
        <p className="site-mock-line">
          <span className="site-mock-word">CAPTIONS</span>{' '}
          <span className="site-mock-word">THAT</span>{' '}
          <span className="site-mock-word site-mock-active">MOVE</span>{' '}
          <span className="site-mock-word">WITH</span>{' '}
          <span className="site-mock-word">YOU</span>
        </p>
      </div>
      <div className="site-mock-timeline">
        <span className="site-mock-clip" />
        <span className="site-mock-clip site-mock-clip-alt" />
        <span className="site-mock-clip" />
      </div>
    </div>
  );
}
