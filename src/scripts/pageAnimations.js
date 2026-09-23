import { initIntroExperience } from "./introExperience.js";
import { initSessionTracking } from "../lib/analytics/session.js";

const CLEANUP_KEY = "__byspozzerPageAnimationsCleanup";

function releaseBootGuard() {
  const root = document.documentElement;
  root.classList.add("app-ready");
  root.classList.remove("js-fallback");

  if (window.__BYSP_BOOT_FALLBACK__) {
    window.clearTimeout(window.__BYSP_BOOT_FALLBACK__);
    delete window.__BYSP_BOOT_FALLBACK__;
  }
}

/**
 * Mantém a intro no caminho crítico. As experiências abaixo da dobra
 * carregam em tarefas independentes, evitando importação, avaliação de
 * módulos e criação de todos os ScrollTriggers na mesma tarefa.
 *
 * Um IntersectionObserver antecipa a inicialização se o visitante pular
 * diretamente para uma seção, mesmo antes de chegar a vez dela no idle.
 * Não alteramos nenhuma timeline nem suas configurações.
 */
export function initPageAnimations() {
  if (typeof window === "undefined") return () => {};

  if (typeof window[CLEANUP_KEY] === "function") {
    window[CLEANUP_KEY]();
  }

  const cleanups = [];
  let destroyed = false;
  let idleTask = null;
  let idleMode = null;
  let sectionObserver = null;
  let markFormSubmitted = () => {};

  try {
    cleanups.push(initIntroExperience());
  } catch (error) {
    console.error("Falha ao iniciar a Intro:", error);
    document.documentElement.classList.add("js-fallback");
  } finally {
    releaseBootGuard();
  }

  try {
    const tracking = initSessionTracking();
    markFormSubmitted = tracking.markFormSubmitted;
    if (typeof tracking.cleanup === "function") {
      cleanups.push(tracking.cleanup);
    }
  } catch (error) {
    console.error("Falha ao iniciar analytics de sessão:", error);
  }

  // A ordem segue a sequência das seções. Um clique em âncora ou scroll
  // rápido pode antecipar individualmente qualquer uma delas.
  const jobs = [
    {
      selector: "[data-testimonials]",
      load: () => import("./testimonials.js"),
      init: (module) => module.initTestimonials(),
      started: false,
    },
    {
      selector: "[data-service]",
      load: () => import("./serviceExperience.js"),
      init: (module) => module.initServiceExperience(),
      started: false,
    },
    {
      selector: "[data-process]",
      load: () => import("./processExperience.js"),
      init: (module) => module.initProcessExperience(),
      started: false,
    },
    {
      selector: "[data-contact]",
      load: () => import("./contactExperience.js"),
      init: (module) => module.initContactExperience({ onFormSubmitted: markFormSubmitted }),
      started: false,
    },
  ];

  const cancelIdleTask = () => {
    if (idleTask === null) return;
    if (idleMode === "idle") {
      window.cancelIdleCallback?.(idleTask);
    } else {
      window.clearTimeout(idleTask);
    }
    idleTask = null;
  };

  const runJob = async (job) => {
    if (destroyed || job.started) return;
    job.started = true;
    if (job.element) sectionObserver?.unobserve(job.element);

    try {
      const module = await job.load();
      if (destroyed) return;
      const cleanup = job.init(module);
      if (typeof cleanup === "function") cleanups.push(cleanup);
    } catch (error) {
      console.error(`Falha ao iniciar experiência ${job.selector}:`, error);
    }
  };

  const scheduleNext = () => {
    if (destroyed) return;
    cancelIdleTask();

    const nextJob = jobs.find((job) => !job.started);
    if (!nextJob) return;

    const begin = () => {
      idleTask = null;
      // Aguarda apenas o módulo desta seção antes de ceder a próxima tarefa.
      void runJob(nextJob).finally(scheduleNext);
    };

    if ("requestIdleCallback" in window) {
      idleMode = "idle";
      idleTask = window.requestIdleCallback(begin, { timeout: 1500 });
    } else {
      // Safari: garante ao menos algumas oportunidades de paint entre módulos.
      idleMode = "timeout";
      idleTask = window.setTimeout(begin, 160);
    }
  };

  if ("IntersectionObserver" in window) {
    sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || destroyed) continue;
          const job = jobs.find((candidate) => candidate.element === entry.target);
          if (!job) continue;
          sectionObserver.unobserve(entry.target);
          // Não espera o idle se a seção já estiver próxima de aparecer.
          void runJob(job).finally(scheduleNext);
        }
      },
      { rootMargin: "150% 0px", threshold: 0 }
    );

    for (const job of jobs) {
      job.element = document.querySelector(job.selector);
      if (job.element) sectionObserver.observe(job.element);
    }
  }

  scheduleNext();

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    cancelIdleTask();
    sectionObserver?.disconnect();

    for (let index = cleanups.length - 1; index >= 0; index -= 1) {
      cleanups[index]?.();
    }

    if (window[CLEANUP_KEY] === cleanup) delete window[CLEANUP_KEY];
  };

  window[CLEANUP_KEY] = cleanup;
  return cleanup;
}
