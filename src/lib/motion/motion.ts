'use client';

/** True when animations should be skipped: the visitor asked for less motion, or the browser cannot animate. */
export function reducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const CART_BUMP = 'gks:cart-bump';

function canAnimate(el: Element | null): el is HTMLElement {
  return !!el && typeof (el as HTMLElement).animate === 'function' && !reducedMotion();
}

/**
 * Sends a copy of the product photo (or a turmeric "+1" dot) in an arc into the header cart icon,
 * then tells the cart icon to wiggle.
 */
export function flyToCart(from: Element | null): void {
  const bump = () => window.dispatchEvent(new Event(CART_BUMP));
  const target = document.querySelector('[data-cart-target]');
  if (!from || !target || !canAnimate(from)) {
    bump();
    return;
  }
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = Math.min(96, Math.max(44, Math.min(a.width, a.height)));
  const ghost = document.createElement('div');
  const img = from instanceof HTMLImageElement ? from.currentSrc || from.src : null;
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${a.left + a.width / 2 - size / 2}px`,
    top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '9999px',
    zIndex: '90',
    pointerEvents: 'none',
    boxShadow: '0 10px 24px rgba(43,27,18,.35)',
    border: '3px solid #fff',
    background: img ? `center / cover no-repeat url("${img}")` : '#F2B300',
    color: '#2B1B12',
    display: 'grid',
    placeItems: 'center',
    font: '600 22px var(--font-display, sans-serif)',
  } satisfies Partial<CSSStyleDeclaration>);
  if (!img) ghost.textContent = '+1';
  ghost.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const lift = Math.max(120, Math.abs(dx) * 0.25);
  const anim = ghost.animate(
    [
      { transform: 'translate(0,0) scale(0.6) rotate(0deg)', opacity: 0.4 },
      { offset: 0.15, transform: 'translate(0,-20px) scale(1.1) rotate(-20deg)', opacity: 1 },
      { offset: 0.55, transform: `translate(${dx * 0.55}px, ${dy * 0.55 - lift}px) scale(0.75) rotate(200deg)`, opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.18) rotate(400deg)`, opacity: 0.7 },
    ],
    { duration: 850, easing: 'cubic-bezier(.5,0,.4,1)' },
  );
  anim.onfinish = () => {
    ghost.remove();
    bump();
    burst(b.left + b.width / 2, b.top + b.height / 2, 10, 70);
  };
}

const GRAINS = ['#E2B06A', '#A0522D', '#7CB342', '#F2B300', '#C98A4B', '#F6D27A', '#C0182B'];

/** A burst of chana, peanut and pea "grains" from a point on the screen. */
export function burst(x: number, y: number, count = 40, spread = 260): void {
  if (typeof document === 'undefined' || reducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const g = document.createElement('span');
    const w = 7 + Math.random() * 9;
    Object.assign(g.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${w * (0.7 + Math.random() * 0.35)}px`,
      borderRadius: '50%',
      background: GRAINS[i % GRAINS.length],
      boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.18)',
      zIndex: '95',
      pointerEvents: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    g.setAttribute('aria-hidden', 'true');
    document.body.appendChild(g);
    const angle = Math.random() * Math.PI * 2;
    const dist = spread * (0.35 + Math.random() * 0.65);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - spread * 0.35;
    const fall = spread * (0.6 + Math.random() * 0.8);
    const spin = (Math.random() - 0.5) * 900;
    const anim = g.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0.3) rotate(0deg)', opacity: 1 },
        { offset: 0.35, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${spin / 2}deg)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + fall}px)) scale(0.9) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.4,1)' },
    );
    anim.onfinish = () => g.remove();
  }
}

/** Burst from the middle of an element (for example, the Place order button). */
export function burstFrom(el: Element | null, count = 60): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, count, 320);
}
