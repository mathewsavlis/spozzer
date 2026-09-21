import { initIntroExperience } from "./introExperience.js";
import { initSessionTracking } from "../lib/analytics/session.js";

const CLEANUP_KEY = "__byspozzerPageAnimationsCleanup";

function releaseBootGuard() {
  const root = document.documentElement;

  root.classList.add("app-ready");
  root.classList.remove("js-fallback");

  if (window.__BYSP_BOOT_FALLBACK__) {
    window.clearTimeout(
      window.__BYSP_BOOT_FALLBACK__
    );

    delete window.__BYSP_BOOT_FALLBACK__;
  }
}

export function initPageAnimations() {
  if (typeof window === "undefined") {
    return () => {};
  }

  const previousCleanup =
    window[CLEANUP_KEY];

  if (
    typeof previousCleanup ===
    "function"
  ) {
    previousCleanup();
  }

  const cleanups = [];

  let destroyed = false;
  let secondaryTaskId = null;
  let secondaryTaskType = null;

  /*
   * =========================================
   * VISITOR ANALYTICS
   * =========================================
   *
   * Início cedo (não espera as experiências
   * secundárias) para que as seções sejam
   * observadas o quanto antes — engajamento
   * logo no início da visita não pode ficar
   * de fora da contagem.
   */

  const { markFormSubmitted } =
    initSessionTracking();

  /*
   * =========================================
   * CRITICAL PATH
   * =========================================
   *
   * A Intro é a única experiência que precisa
   * existir antes do primeiro paint útil.
   *
   * As demais seções ficam fora da viewport
   * por vários comprimentos de tela e podem
   * ser carregadas depois.
   */

  try {
    cleanups.push(
      initIntroExperience()
    );
  } catch (error) {
    console.error(
      "Falha ao iniciar a Intro:",
      error
    );

    document.documentElement
      .classList.add("js-fallback");
  } finally {
    releaseBootGuard();
  }

  /*
   * =========================================
   * NON-CRITICAL EXPERIENCES
   * =========================================
   *
   * Dynamic import reduz o JS necessário
   * para o primeiro paint e tira trabalho
   * do main thread durante a abertura do Hero.
   */

  const loadSecondaryExperiences =
    async () => {
      if (destroyed) return;

      try {
        const [
          testimonialsModule,
          serviceModule,
          processModule,
          contactModule,
        ] = await Promise.all([
          import("./testimonials.js"),
          import("./serviceExperience.js"),
          import("./processExperience.js"),
          import("./contactExperience.js"),
        ]);

        if (destroyed) return;

        cleanups.push(
          testimonialsModule
            .initTestimonials(),
          serviceModule
            .initServiceExperience(),
          processModule
            .initProcessExperience(),
          contactModule
            .initContactExperience({
              onFormSubmitted:
                markFormSubmitted,
            })
        );
      } catch (error) {
        /*
         * O conteúdo dessas seções continua
         * acessível pelo fallback CSS/HTML.
         */
        console.error(
          "Falha ao iniciar experiências secundárias:",
          error
        );
      }
    };

  if (
    "requestIdleCallback" in window
  ) {
    secondaryTaskType = "idle";

    secondaryTaskId =
      window.requestIdleCallback(
        () => {
          void loadSecondaryExperiences();
        },
        {
          timeout: 1200,
        }
      );
  } else {
    secondaryTaskType = "timeout";

    secondaryTaskId =
      window.setTimeout(
        () => {
          void loadSecondaryExperiences();
        },
        120
      );
  }

  const cleanup = () => {
    if (destroyed) return;

    destroyed = true;

    if (
      secondaryTaskId !== null
    ) {
      if (
        secondaryTaskType === "idle"
      ) {
        window.cancelIdleCallback?.(
          secondaryTaskId
        );
      } else {
        window.clearTimeout(
          secondaryTaskId
        );
      }
    }

    for (
      let index =
        cleanups.length - 1;
      index >= 0;
      index -= 1
    ) {
      cleanups[index]?.();
    }

    if (
      window[CLEANUP_KEY] === cleanup
    ) {
      delete window[CLEANUP_KEY];
    }
  };

  window[CLEANUP_KEY] = cleanup;

  return cleanup;
}