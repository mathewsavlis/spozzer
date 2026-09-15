import { initIntroExperience } from "./introExperience.js";
import { initTestimonials } from "./testimonials.js";
import { initServiceExperience } from "./serviceExperience.js";
import { initProcessExperience } from "./processExperience.js";
import { initContactExperience } from "./contactExperience.js";

const CLEANUP_KEY = "__byspozzerPageAnimationsCleanup";

export function initPageAnimations() {
  if (typeof window === "undefined") return () => {};

  const previousCleanup = window[CLEANUP_KEY];
  if (typeof previousCleanup === "function") previousCleanup();

  const cleanups = [
    initIntroExperience(),
    initTestimonials(),
    initServiceExperience(),
    initProcessExperience(),
    initContactExperience(),
  ];

  let destroyed = false;

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;

    for (let index = cleanups.length - 1; index >= 0; index -= 1) {
      cleanups[index]?.();
    }

    if (window[CLEANUP_KEY] === cleanup) {
      delete window[CLEANUP_KEY];
    }
  };

  window[CLEANUP_KEY] = cleanup;
  return cleanup;
}
