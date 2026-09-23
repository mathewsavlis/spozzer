import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Exercise the startup scheduler in isolation without requiring Astro/GSAP
// to be installed. Replace only its external imports with controlled stubs.
function createSchedulerHarness() {
  const events = [];
  const cleanupEvents = [];
  const elements = Object.fromEntries(
    ['[data-testimonials]', '[data-service]', '[data-process]', '[data-contact]']
      .map((selector) => [selector, { selector }])
  );
  const scheduled = new Map();
  let nextId = 0;
  let observer;

  class IntersectionObserverMock {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.targets = new Set();
      this.disconnected = false;
      observer = this;
    }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.disconnected = true; this.targets.clear(); }
    enter(selector) {
      const target = elements[selector];
      assert.ok(this.targets.has(target));
      this.callback([{ target, isIntersecting: true }]);
    }
  }

  const modules = {
    testimonials: { initTestimonials: () => { events.push('testimonials'); return () => cleanupEvents.push('testimonials'); } },
    service: { initServiceExperience: () => { events.push('service'); return () => cleanupEvents.push('service'); } },
    process: { initProcessExperience: () => { events.push('process'); return () => cleanupEvents.push('process'); } },
    contact: { initContactExperience: ({ onFormSubmitted }) => {
      assert.equal(typeof onFormSubmitted, 'function');
      events.push('contact');
      return () => cleanupEvents.push('contact');
    } },
  };

  const window = {
    IntersectionObserver: IntersectionObserverMock,
    requestIdleCallback: (fn) => { scheduled.set(++nextId, fn); return nextId; },
    cancelIdleCallback: (id) => scheduled.delete(id),
    clearTimeout: () => {},
  };
  const document = {
    documentElement: { classList: { add() {}, remove() {} } },
    querySelector: (selector) => elements[selector] ?? null,
  };
  const source = readFileSync(resolve(root, 'src/scripts/pageAnimations.js'), 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace('export function initPageAnimations()', 'function initPageAnimations()')
    .replace('import("./testimonials.js")', 'Promise.resolve(modules.testimonials)')
    .replace('import("./serviceExperience.js")', 'Promise.resolve(modules.service)')
    .replace('import("./processExperience.js")', 'Promise.resolve(modules.process)')
    .replace('import("./contactExperience.js")', 'Promise.resolve(modules.contact)')
    + '\nglobalThis.start = initPageAnimations;';
  const sandbox = {
    window, document, modules, IntersectionObserver: IntersectionObserverMock,
    initIntroExperience: () => { events.push('intro'); return () => cleanupEvents.push('intro'); },
    initSessionTracking: () => { events.push('tracking'); return { markFormSubmitted() {}, cleanup() { cleanupEvents.push('tracking'); } }; },
    console,
  };
  runInNewContext(source, sandbox);
  return {
    events, cleanupEvents, observer: () => observer, scheduled,
    start: sandbox.start,
    async flushIdle() {
      const task = scheduled.entries().next().value;
      if (!task) return false;
      scheduled.delete(task[0]);
      task[1]();
      await new Promise((resolve) => setImmediate(resolve));
      return true;
    },
    tick: () => new Promise((resolve) => setImmediate(resolve)),
  };
}

test('intro stays critical; other experiences run separately and cleanup fully', async () => {
  const h = createSchedulerHarness();
  const release = h.start();
  assert.deepEqual(h.events, ['intro', 'tracking']);
  assert.equal(h.scheduled.size, 1);

  // An anchor jump must initialize Contact before the regular idle queue.
  h.observer().enter('[data-contact]');
  await h.tick();
  assert.deepEqual(h.events.slice(0, 3), ['intro', 'tracking', 'contact']);
  assert.equal(h.observer().targets.size, 3);

  for (let i = 0; i < 6; i++) {
    if (!(await h.flushIdle())) break;
  }
  assert.deepEqual(new Set(h.events), new Set(['intro', 'tracking', 'contact', 'testimonials', 'service', 'process']));
  assert.equal(h.events.length, 6, 'each experience starts only once');
  release();
  assert.equal(h.observer().disconnected, true);
  assert.equal(h.scheduled.size, 0);
  assert.deepEqual(new Set(h.cleanupEvents), new Set(['intro', 'tracking', 'contact', 'testimonials', 'service', 'process']));
});

test('an idle task is canceled when page startup is torn down', () => {
  const h = createSchedulerHarness();
  const release = h.start();
  release();
  assert.equal(h.scheduled.size, 0);
  assert.equal(h.observer().disconnected, true);
  assert.deepEqual(h.events, ['intro', 'tracking']);
});
