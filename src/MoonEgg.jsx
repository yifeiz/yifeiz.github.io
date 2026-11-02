import { useEffect, useRef } from "react";

// Where the moon sits in the background photo, as fractions of the image.
// The radius is a fraction of the image width.
const IMAGE_ASPECT = 6000 / 3376;
const MOON = { x: 0.423, y: 0.2361, r: 0.00583 };

const DELAY = 0.8; // seconds of hovering before the moon starts to grow
const GROW = 5; // seconds of growth until it covers the screen
const RETREAT = 3; // shrinks back this many times faster than it grows

// Hover over (or press and hold) the moon. It swells slowly at first, then
// faster and faster until it swallows the page and opens the arcade.
const MoonEgg = ({ onComplete }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    let maxScale = 1;
    let hovering = false;
    let elapsed = 0;
    let last = null;
    let frame = null;

    // Mirror `background-size: cover; background-position: center`.
    const place = () => {
      const { clientWidth: w, clientHeight: h } = el.parentElement;
      const imgW = Math.max(w, h * IMAGE_ASPECT);
      const imgH = imgW / IMAGE_ASPECT;
      const cx = (w - imgW) / 2 + MOON.x * imgW;
      const cy = (h - imgH) / 2 + MOON.y * imgH;
      const r = MOON.r * imgW;
      Object.assign(el.style, {
        left: `${cx - r}px`,
        top: `${cy - r}px`,
        width: `${2 * r}px`,
        height: `${2 * r}px`,
      });
      maxScale = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) / r;
    };

    const tick = (now) => {
      const dt = last === null ? 0 : (now - last) / 1000;
      last = now;
      elapsed = hovering
        ? elapsed + dt
        : Math.max(0, elapsed - dt * RETREAT);

      // Ease in with t^2 in the exponent: barely moves for the first couple
      // of seconds, then races to fill the screen.
      const t = Math.min(1, Math.max(0, elapsed - DELAY) / GROW);
      el.style.transform = `scale(${Math.exp(Math.log(maxScale) * t * t)})`;
      el.classList.toggle("growing", elapsed > DELAY);

      if (t >= 1 || (!hovering && elapsed === 0)) {
        frame = null;
        last = null;
        if (t >= 1) onComplete();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      hovering = true;
      if (frame === null) frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      hovering = false;
    };
    const noMenu = (e) => e.preventDefault();
    // Coming back from the arcade restores this page from the back/forward
    // cache with the moon still covering everything.
    const reset = (e) => {
      if (!e.persisted) return;
      hovering = false;
      elapsed = 0;
      el.style.transform = "";
      el.classList.remove("growing");
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("pageshow", reset);
    el.addEventListener("pointerenter", start);
    el.addEventListener("pointerdown", start);
    el.addEventListener("pointerleave", stop);
    el.addEventListener("pointercancel", stop);
    el.addEventListener("contextmenu", noMenu);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("pageshow", reset);
      el.removeEventListener("pointerenter", start);
      el.removeEventListener("pointerdown", start);
      el.removeEventListener("pointerleave", stop);
      el.removeEventListener("pointercancel", stop);
      el.removeEventListener("contextmenu", noMenu);
    };
  }, [onComplete]);

  return <div ref={ref} className="moon-egg" aria-hidden="true" />;
};

export default MoonEgg;
