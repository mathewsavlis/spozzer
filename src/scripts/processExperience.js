import { gsap } from "../lib/gsap.js";

const MOBILE_QUERY =
  "(max-width: 47.999rem)";

const DESKTOP_QUERY =
  "(min-width: 48rem)";

const REDUCED_MOTION_QUERY =
  "(prefers-reduced-motion: reduce)";

export function initProcessExperience() {
  const section =
    document.querySelector(
      "[data-process]"
    );

  if (
    !(section instanceof HTMLElement)
  ) {
    return () => { };
  }

  /*
   * =========================================
   * STABLE MOBILE STEP HEIGHT
   * =========================================
   *
   * O Process é uma narrativa vertical.
   *
   * Portanto NÃO congelamos a altura
   * da section inteira.
   *
   * Congelamos somente a altura mínima
   * dos steps, que originalmente era
   * baseada em 26svh.
   */

  const mobileViewportQuery =
    window.matchMedia(
      MOBILE_QUERY
    );

  let stableViewportWidth =
    window.innerWidth;

  const setStableStepHeight =
    () => {
      /*
       * Desktop volta a usar
       * sua própria regra CSS.
       */
      if (
        !mobileViewportQuery.matches
      ) {
        section.style.removeProperty(
          "--process-step-min-height"
        );

        return;
      }

      /*
       * Capturamos a altura útil
       * somente quando a geometria
       * precisa realmente ser definida.
       */
      const viewportHeight =
        Math.round(
          window.visualViewport?.height ??
          window.innerHeight
        );

      /*
       * Mantemos exatamente a proporção
       * visual anterior:
       *
       * 26svh = 26% da viewport.
       */
      const stepHeight =
        Math.round(
          viewportHeight * 0.26
        );

      /*
       * A largura é nossa referência
       * para diferenciar:
       *
       * toolbar / teclado
       *
       * de
       *
       * mudança real de orientação.
       */
      stableViewportWidth =
        window.innerWidth;

      section.style.setProperty(
        "--process-step-min-height",
        `${stepHeight}px`
      );
    };

  const handleViewportResize =
    () => {
      const currentWidth =
        window.innerWidth;

      /*
       * =====================================
       * MOBILE → DESKTOP
       * =====================================
       */

      if (
        !mobileViewportQuery.matches
      ) {
        section.style.removeProperty(
          "--process-step-min-height"
        );

        stableViewportWidth =
          currentWidth;

        return;
      }

      /*
       * =====================================
       * TOOLBAR / KEYBOARD
       * =====================================
       *
       * Safari altera bastante a altura
       * quando a toolbar aparece/some.
       *
       * Como a largura permanece
       * praticamente igual,
       * NÃO recalculamos os steps.
       */

      if (
        Math.abs(
          currentWidth -
          stableViewportWidth
        ) < 20
      ) {
        return;
      }

      /*
       * =====================================
       * REAL VIEWPORT CHANGE
       * =====================================
       *
       * Mudança significativa de largura:
       *
       * portrait → landscape
       * landscape → portrait
       */

      setStableStepHeight();
    };

  /*
   * Primeira captura.
   */

  setStableStepHeight();

  window.addEventListener(
    "resize",
    handleViewportResize,
    {
      passive: true,
    }
  );

  /*
   * =========================================
   * ELEMENTS
   * =========================================
   */

  const headerItems = [
    ...section.querySelectorAll(
      "[data-process-header]"
    ),
  ];

  const media =
    section.querySelector(
      "[data-process-media]"
    );

  const mediaShell =
    section.querySelector(
      "[data-process-media-shell]"
    );

  const visual =
    section.querySelector(
      "[data-process-visual]"
    );

  const steps = [
    ...section.querySelectorAll(
      "[data-process-step]"
    ),
  ];

  /*
   * =========================================
   * VALIDATION
   * =========================================
   *
   * Se alguma parte obrigatória não existir,
   * limpamos também o listener de viewport
   * antes de abandonar a experiência.
   */

  if (
    headerItems.length === 0 ||
    !(
      mediaShell instanceof HTMLElement
    ) ||
    !(
      media instanceof HTMLElement
    ) ||
    steps.length === 0 ||
    window.matchMedia(
      REDUCED_MOTION_QUERY
    ).matches
  ) {
    window.removeEventListener(
      "resize",
      handleViewportResize
    );

    section.style.removeProperty(
      "--process-step-min-height"
    );

    return () => { };
  }

  /*
 * =========================================
 * PROCESS VIDEO PLAYBACK
 * =========================================
 */

  const processVideo =
    visual instanceof HTMLVideoElement
      ? visual
      : null;


  let videoObserver =
    null;


  let videoPrepared =
    false;


  if (processVideo) {
    processVideo.muted =
      true;

    processVideo.defaultMuted =
      true;

    processVideo.loop =
      true;

    processVideo.playsInline =
      true;


    const prepareVideo =
      () => {
        if (videoPrepared) {
          return;
        }

        videoPrepared =
          true;

        processVideo.load();
      };


    const playVideo =
      () => {
        prepareVideo();

        const playPromise =
          processVideo.play();

        if (
          playPromise &&
          typeof playPromise.catch ===
          "function"
        ) {
          playPromise.catch(
            () => {
              /*
               * Safari pode bloquear autoplay
               * por política do sistema.
               *
               * Não tratamos como erro fatal.
               */
            }
          );
        }
      };


    const pauseVideo =
      () => {
        processVideo.pause();
      };


    if (
      "IntersectionObserver" in window
    ) {
      videoObserver =
        new IntersectionObserver(
          ([entry]) => {
            if (
              entry?.isIntersecting
            ) {
              playVideo();
            } else {
              pauseVideo();
            }
          },

          {
            /*
             * Começa a carregar antes
             * de o Process entrar na tela.
             */

            rootMargin:
              "50% 0px",

            threshold:
              0.01,
          }
        );


      videoObserver.observe(
        section
      );
    } else {
      playVideo();
    }
  }

  /*
   * =========================================
   * RESPONSIVE GSAP
   * =========================================
   */

  const mediaQueries =
    gsap.matchMedia();

  mediaQueries.add(
    {
      mobile:
        MOBILE_QUERY,

      desktop:
        DESKTOP_QUERY,
    },

    ({ conditions }) => {
      const context =
        gsap.context(
          () => {
            /*
             * =========================================
             * MOBILE
             * =========================================
             */

            if (
              conditions.mobile
            ) {
              /*
               * =====================================
               * HEADER
               * =====================================
               */

              gsap.set(
                headerItems,
                {
                  autoAlpha:
                    0,

                  y:
                    28,

                  clipPath:
                    "inset(0% 0% 100% 0%)",

                  willChange:
                    "transform, opacity, clip-path",
                }
              );

              gsap.to(
                headerItems,
                {
                  autoAlpha:
                    1,

                  y:
                    0,

                  clipPath:
                    "inset(0% 0% 0% 0%)",

                  duration:
                    0.82,

                  stagger:
                    0.18,

                  ease:
                    "power3.out",

                  scrollTrigger: {
                    /*
                     * A animação começa quando
                     * título e descrição já estão
                     * dentro da área principal
                     * de leitura.
                     */

                    trigger:
                      headerItems[0],

                    start:
                      "top 70%",

                    toggleActions:
                      "play none none reverse",
                  },
                }
              );

              /*
               * =====================================
               * MEDIA
               * =====================================
               */

              gsap.set(
                mediaShell,
                {
                  autoAlpha:
                    0,

                  y:
                    18,

                  clipPath:
                    "inset(100% 0% 0% 0%)",

                  willChange:
                    "transform, opacity, clip-path",
                }
              );

              gsap.set(
                media,
                {
                  clipPath:
                    "inset(100% 0% 0% 0%)",

                  willChange:
                    "clip-path",
                }
              );

              const mediaTimeline =
                gsap.timeline({
                  scrollTrigger: {
                    trigger:
                      mediaShell,

                    start:
                      "top 80%",

                    toggleActions:
                      "play none none reverse",
                  },
                });

              mediaTimeline
                .to(
                  mediaShell,
                  {
                    autoAlpha:
                      1,

                    y:
                      0,

                    clipPath:
                      "inset(0% 0% 0% 0%)",

                    duration:
                      0.72,

                    ease:
                      "power3.out",
                  },

                  0
                )

                .to(
                  media,
                  {
                    clipPath:
                      "inset(0% 0% 0% 0%)",

                    duration:
                      0.86,

                    ease:
                      "power2.inOut",
                  },

                  0.08
                );

              /*
               * =====================================
               * STEPS
               * =====================================
               */

              steps.forEach(
                (step) => {
                  const dot =
                    step.querySelector(
                      "[data-step-dot]"
                    );

                  const items = [
                    ...step.querySelectorAll(
                      "[data-step-item]"
                    ),
                  ];

                  /*
                   * Step fora de foco.
                   */

                  gsap.set(
                    step,
                    {
                      opacity:
                        0.3,

                      willChange:
                        "opacity",
                    }
                  );

                  /*
                   * Conteúdo começa escondido.
                   */

                  gsap.set(
                    items,
                    {
                      autoAlpha:
                        0,

                      y:
                        20,

                      willChange:
                        "transform, opacity",
                    }
                  );

                  if (dot) {
                    gsap.set(
                      dot,
                      {
                        opacity:
                          0.24,

                        scale:
                          0.7,

                        willChange:
                          "transform, opacity",
                      }
                    );
                  }

                  /*
                   * Timeline individual
                   * do step mobile.
                   */

                  const timeline =
                    gsap.timeline({
                      scrollTrigger: {
                        trigger:
                          step,

                        start:
                          "top 72%",

                        toggleActions:
                          "play none none reverse",
                      },
                    });

                  /*
                   * STEP
                   */

                  timeline.to(
                    step,
                    {
                      opacity:
                        1,

                      duration:
                        0.42,

                      ease:
                        "power2.out",
                    },

                    0
                  );

                  /*
                   * TEXTOS
                   */

                  timeline.to(
                    items,
                    {
                      autoAlpha:
                        1,

                      y:
                        0,

                      duration:
                        0.62,

                      stagger:
                        0.08,

                      ease:
                        "power3.out",
                    },

                    0.06
                  );

                  /*
                   * DOT
                   */

                  if (dot) {
                    timeline.to(
                      dot,
                      {
                        opacity:
                          1,

                        scale:
                          1,

                        duration:
                          0.42,

                        ease:
                          "power3.out",
                      },

                      0.1
                    );
                  }
                }
              );

              return;
            }

            /*
             * =========================================
             * DESKTOP
             * =========================================
             *
             * Mantido no modelo original
             * vinculado diretamente ao scroll.
             */

            gsap.set(
              headerItems,
              {
                autoAlpha:
                  0,

                y:
                  20,
              }
            );

            gsap.to(
              headerItems,
              {
                autoAlpha:
                  1,

                y:
                  0,

                duration:
                  0.8,

                stagger:
                  0.14,

                ease:
                  "power2.out",

                scrollTrigger: {
                  trigger:
                    headerItems[0],

                  start:
                    "top 90%",

                  end:
                    "top 55%",

                  scrub:
                    0.55,

                  invalidateOnRefresh:
                    true,
                },
              }
            );

            /*
             * =====================================
             * MEDIA
             * =====================================
             */

            gsap.set(
              mediaShell,
              {
                autoAlpha:
                  0,

                y:
                  24,

                clipPath:
                  "inset(100% 0% 0% 0%)",
              }
            );

            gsap.set(
              media,
              {
                clipPath:
                  "inset(100% 0% 0% 0%)",
              }
            );

            if (visual) {
              gsap.set(
                visual,
                {
                  scale: 1.055,
                }
              );
            }

            const mediaTimeline =
              gsap.timeline({
                scrollTrigger: {
                  trigger:
                    mediaShell,

                  start:
                    "top 90%",

                  end:
                    "top 38%",

                  scrub:
                    0.7,

                  invalidateOnRefresh:
                    true,
                },
              });

            mediaTimeline
              .to(
                mediaShell,
                {
                  autoAlpha:
                    1,

                  y:
                    0,

                  clipPath:
                    "inset(0% 0% 0% 0%)",

                  duration:
                    0.45,

                  ease:
                    "power3.out",
                },

                0
              )

              .to(
                media,
                {
                  clipPath:
                    "inset(0% 0% 0% 0%)",

                  duration:
                    1,

                  ease:
                    "power2.inOut",
                },

                0
              );

            if (visual) {
              mediaTimeline.to(
                visual,
                {
                  scale: 1,
                  duration: 0.65,
                  ease: "power2.inOut",
                },
                0.25
              );
            }

            /*
             * =====================================
             * STEPS
             * =====================================
             */

            steps.forEach(
              (step) => {
                const dot =
                  step.querySelector(
                    "[data-step-dot]"
                  );

                const items = [
                  ...step.querySelectorAll(
                    "[data-step-item]"
                  ),
                ];

                gsap.set(
                  step,
                  {
                    opacity:
                      0.18,

                    x:
                      0,
                  }
                );

                gsap.set(
                  items,
                  {
                    y:
                      7,
                  }
                );

                if (dot) {
                  gsap.set(
                    dot,
                    {
                      opacity:
                        0.3,

                      scale:
                        0.68,
                    }
                  );
                }

                const timeline =
                  gsap.timeline({
                    defaults: {
                      ease:
                        "none",
                    },

                    scrollTrigger: {
                      trigger:
                        step,

                      start:
                        "top 78%",

                      end:
                        "bottom 32%",

                      scrub:
                        0.45,

                      invalidateOnRefresh:
                        true,
                    },
                  });

                /*
                 * Step entra em destaque.
                 */

                timeline.to(
                  step,
                  {
                    opacity:
                      1,

                    x:
                      16,

                    duration:
                      0.34,
                  },

                  0
                );

                /*
                 * Conteúdo acompanha.
                 */

                timeline.to(
                  items,
                  {
                    y:
                      0,

                    duration:
                      0.34,

                    stagger:
                      0.045,

                    ease:
                      "power1.out",
                  },

                  0.04
                );

                /*
                 * Dot ativo.
                 */

                if (dot) {
                  timeline.to(
                    dot,
                    {
                      opacity:
                        1,

                      scale:
                        1,

                      duration:
                        0.3,

                      ease:
                        "power2.out",
                    },

                    0.08
                  );
                }

                /*
                 * Pequeno espaço de leitura.
                 */

                timeline.to(
                  {},
                  {
                    duration:
                      0.1,
                  }
                );

                /*
                 * Step perde destaque.
                 */

                timeline.to(
                  step,
                  {
                    opacity:
                      0.18,

                    x:
                      0,

                    duration:
                      0.34,
                  }
                );

                timeline.to(
                  items,
                  {
                    y:
                      -5,

                    duration:
                      0.32,

                    stagger:
                      0.035,

                    ease:
                      "power1.inOut",
                  },

                  "<"
                );

                /*
                 * Dot volta ao estado neutro.
                 */

                if (dot) {
                  timeline.to(
                    dot,
                    {
                      opacity:
                        0.3,

                      scale:
                        0.68,

                      duration:
                        0.3,
                    },

                    "<"
                  );
                }
              }
            );
          },

          section
        );

      return () => {
        context.revert();
      };
    }
  );

  /*
   * =========================================
   * CLEANUP
   * =========================================
   *
   * Fundamental para HMR e para evitar
   * listeners antigos interferindo
   * em novas inicializações.
   */

  return () => {
    window.removeEventListener(
      "resize",
      handleViewportResize
    );

    section.style.removeProperty(
      "--process-step-min-height"
    );

    videoObserver?.disconnect();
    processVideo?.pause();

    mediaQueries.revert();
  };
}