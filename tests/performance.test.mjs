import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { createHorizontalDrag } from '../src/lib/interactions/horizontalDrag.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function createDragHarness() {
  const original = {
    HTMLElement: globalThis.HTMLElement,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  let frameId = 0;
  const frames = new Map();
  class Element {
    listeners = new Map();
    captured = null;
    addEventListener(type, fn) { this.listeners.set(type, fn); }
    removeEventListener(type) { this.listeners.delete(type); }
    setPointerCapture(id) { this.captured = id; }
    hasPointerCapture(id) { return this.captured === id; }
    releasePointerCapture() { this.captured = null; }
    send(type, { x = 0, y = 0, id = 1 } = {}) {
      let prevented = false;
      this.listeners.get(type)?.({ pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y, preventDefault() { prevented = true; } });
      return prevented;
    }
  }
  globalThis.HTMLElement = Element;
  globalThis.requestAnimationFrame = (fn) => { frames.set(++frameId, fn); return frameId; };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  return {
    target: new Element(),
    tick() { const batch = [...frames.values()]; frames.clear(); batch.forEach((fn) => fn()); },
    pending() { return frames.size; },
    restore() {
      for (const [name, value] of Object.entries(original)) {
        if (value === undefined) delete globalThis[name];
        else globalThis[name] = value;
      }
    },
  };
}

test('drag groups frequent pointer events into one render per frame', () => {
  const h = createDragHarness();
  const moves = [];
  let starts = 0;
  let endedAt = null;
  try {
    const release = createHorizontalDrag(h.target, {
      onStart: () => starts++,
      onMove: ({ deltaX }) => moves.push(deltaX),
      onEnd: ({ deltaX }) => { endedAt = deltaX; },
    });
    h.target.send('pointerdown', { x: 0, y: 0 });
    for (const x of [10, 20, 35, 41]) h.target.send('pointermove', { x });
    assert.equal(starts, 1);
    assert.equal(h.pending(), 1);
    assert.deepEqual(moves, []);
    h.tick();
    assert.deepEqual(moves, [41]);
    h.target.send('pointerup', { x: 41 });
    assert.equal(endedAt, 41);
    release();
  } finally { h.restore(); }
});

test('drag applies final pending position before pointerup; leaves vertical scroll alone', () => {
  const h = createDragHarness();
  const events = [];
  try {
    const release = createHorizontalDrag(h.target, {
      onStart: () => events.push('start'),
      onMove: ({ deltaX }) => events.push(`move:${deltaX}`),
      onEnd: ({ deltaX }) => events.push(`end:${deltaX}`),
    });
    h.target.send('pointerdown');
    assert.equal(h.target.send('pointermove', { x: 3, y: 20 }), false);
    h.target.send('pointerup', { x: 3, y: 20 });
    assert.deepEqual(events, []);
    h.target.send('pointerdown');
    h.target.send('pointermove', { x: 19 });
    h.target.send('pointerup', { x: 19 });
    assert.deepEqual(events, ['start', 'move:19', 'end:19']);
    assert.equal(h.pending(), 0);
    release();
    assert.equal(h.target.listeners.size, 0);
  } finally { h.restore(); }
});

test('drag releases scheduled renders on cleanup', () => {
  const h = createDragHarness();
  let calls = 0;
  try {
    const release = createHorizontalDrag(h.target, { onMove: () => calls++ });
    h.target.send('pointerdown');
    h.target.send('pointermove', { x: 22 });
    release();
    h.tick();
    assert.equal(calls, 0);
  } finally { h.restore(); }
});

test('the referenced public assets exist after pruning unused originals', async () => {
  for (const name of ['heroData', 'portfolioData', 'aboutData', 'testimonialsData', 'processData']) {
    const module = await import(`../src/data/${name}.js`);
    function walk(value) {
      if (typeof value === 'string' && /\.(?:webp|jpg|png|mp4|webm)$/.test(value)) {
        assert.ok(existsSync(join(root, 'public', value.replace(/^\//, ''))), `${name}: ${value}`);
      } else if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach(walk);
      }
    }
    walk(module[Object.keys(module)[0]]);
  }
});

test('cookie notice uses the full-width contact background and neutral text', () => {
  const layout = readFileSync(join(root, 'src/layouts/BaseLayout.astro'), 'utf8');
  assert.match(layout, /<footer class="site-footer">/);
  assert.match(layout, /\.site-footer\s*\{[^}]*width:\s*100%;[^}]*background:\s*var\(--color-light\)/s);
  assert.match(layout, /Utilizamos cookies/);
  assert.doesNotMatch(layout, /Ao continuar navegando, você concorda/);
});


test('the intro boot lock is scoped to the landing page, not the thank-you page', () => {
  const layout = readFileSync(join(root, 'src/layouts/BaseLayout.astro'), 'utf8');
  const index = readFileSync(join(root, 'src/pages/index.astro'), 'utf8');
  const thanks = readFileSync(join(root, 'src/pages/obrigado.astro'), 'utf8');
  assert.match(layout, /introGuard = false/);
  assert.match(layout, /if \(root\.dataset\.introGuard !== "true"\) return/);
  assert.match(index, /<BaseLayout\s+introGuard/);
  assert.doesNotMatch(thanks, /<BaseLayout\s+introGuard/);
});
