import { gsap } from "../lib/gsap.js";


const MOBILE_QUERY =
  "(max-width: 47.999rem)";

const DESKTOP_QUERY =
  "(min-width: 48rem)";

const REDUCED_MOTION_QUERY =
  "(prefers-reduced-motion: reduce)";


export function initServiceExperience() {
  const section =
    document.querySelector(
      "[data-service]"
    );


  if (
    !(section instanceof HTMLElement)
  ) {
    return () => { };
  }


  const eyebrow =
    section.querySelector(
      "[data-service-eyebrow]"
    );


  const titleLines = [
    ...section.querySelectorAll(
      "[data-service-title-line]"
    ),
  ];


  const words = [
    ...section.querySelectorAll(
      "[data-service-word]"
    ),
  ];


  if (
    !(eyebrow instanceof HTMLElement) ||
    titleLines.length === 0 ||
    words.length === 0 ||
    window.matchMedia(
      REDUCED_MOTION_QUERY
    ).matches
  ) {
    return () => { };
  }


  /*
   * =========================================
   * STABLE MOBILE CANVAS
   * =========================================
   *
   * Capturamos a altura útil quando
   * a experiência inicializa.
   *
   * Mudanças SOMENTE de altura causadas
   * pela toolbar do navegador são ignoradas.
   *
   * Mudanças reais de largura, como
   * orientação, permitem nova medição.
   */

  const mobileViewportQuery =
    window.matchMedia(
      MOBILE_QUERY
    );


  let stableViewportWidth =
    window.innerWidth;


  const setStableCanvasHeight =
    () => {
      if (
        !mobileViewportQuery.matches
      ) {
        section.style.removeProperty(
          "--service-canvas-height"
        );

        return;
      }


      const height =
        Math.round(
          window.visualViewport?.height ??
          window.innerHeight
        );


      stableViewportWidth =
        window.innerWidth;


      section.style.setProperty(
        "--service-canvas-height",
        `${height}px`
      );
    };


  const handleViewportResize =
    () => {
      const currentWidth =
        window.innerWidth;


      /*
       * Se saímos do mobile,
       * removemos a altura congelada.
       */

      if (
        !mobileViewportQuery.matches
      ) {
        section.style.removeProperty(
          "--service-canvas-height"
        );

        stableViewportWidth =
          currentWidth;

        return;
      }


      /*
       * A toolbar altera fortemente
       * a altura, mas praticamente
       * não altera a largura.
       *
       * Portanto ignoramos esse resize.
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
       * Orientação ou mudança real
       * de viewport.
       */

      setStableCanvasHeight();
    };


  setStableCanvasHeight();


  window.addEventListener(
    "resize",
    handleViewportResize,
    {
      passive: true,
    }
  );


  /*
   * =========================================
   * ANIMATIONS
   * =========================================
   */

  const media =
    gsap.matchMedia();


  media.add(
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
             * =====================================
             * MOBILE
             * =====================================
             *
             * Sem scrub.
             *
             * A toolbar não controla
             * frame a frame a animação.
             */

            if (
              conditions.mobile
            ) {

              /*
               * EYEBROW
               */

              gsap.set(
                eyebrow,
                {
                  autoAlpha:
                    0,

                  yPercent:
                    110,

                  willChange:
                    "transform, opacity",
                }
              );


              /*
               * TITLE
               */

              gsap.set(
                titleLines,
                {
                  autoAlpha:
                    0,

                  yPercent:
                    105,

                  clipPath:
                    "inset(0% 0% 100% 0%)",

                  willChange:
                    "transform, opacity, clip-path",
                }
              );


              /*
               * DESCRIPTION
               */

              gsap.set(
                words,
                {
                  opacity:
                    0,

                  y:
                    14,

                  willChange:
                    "transform, opacity",
                }
              );


              const timeline =
                gsap.timeline({
                  scrollTrigger: {
                    trigger:
                      titleLines[0],

                    start:
                      "top 66%",

                    toggleActions:
                      "play none none reverse",
                  },
                });


              /*
               * EYEBROW
               */

              timeline.to(
                eyebrow,
                {
                  autoAlpha:
                    1,

                  yPercent:
                    0,

                  duration:
                    0.55,

                  ease:
                    "power3.out",
                },

                0
              );


              /*
               * TITLE
               */

              timeline.to(
                titleLines,
                {
                  autoAlpha:
                    1,

                  yPercent:
                    0,

                  clipPath:
                    "inset(0% 0% 0% 0%)",

                  duration:
                    0.9,

                  stagger:
                    0.12,

                  ease:
                    "power3.out",
                },

                0.08
              );


              /*
               * DESCRIPTION
               */

              timeline.to(
                words,
                {
                  opacity:
                    1,

                  y:
                    0,

                  duration:
                    0.52,

                  stagger: {
                    each:
                      0.025,

                    from:
                      "start",
                  },

                  ease:
                    "power2.out",
                },

                0.58
              );


              return;
            }


            /*
 * =========================================
 * DESKTOP
 * =========================================
 *
 * O conteúdo continua reversível,
 * mas usamos o próprio título como trigger.
 *
 * Isso evita que a geometria das sections
 * anteriores deixe o título preso
 * no estado invisível.
 */

            gsap.set(eyebrow, {
              autoAlpha: 0,
              yPercent: 50,
              willChange: "transform, opacity",
            });

            gsap.set(titleLines, {
              autoAlpha: 0,
              yPercent: 55,
              willChange: "transform, opacity",
            });

            gsap.set(words, {
              opacity: 0.14,
              y: 6,
              willChange: "transform, opacity",
            });


            const timeline =
              gsap.timeline({
                scrollTrigger: {
                  trigger: titleLines[0],

                  start: "top 82%",

                  toggleActions:
                    "play none none reverse",
                },
              });


            timeline
              .to(
                eyebrow,
                {
                  autoAlpha: 1,
                  yPercent: 0,

                  duration: 0.42,

                  ease: "power2.out",
                },
                0
              )

              .to(
                titleLines,
                {
                  autoAlpha: 1,
                  yPercent: 0,

                  duration: 0.7,

                  stagger: 0.09,

                  ease: "power3.out",
                },
                0.08
              )

              .to(
                words,
                {
                  opacity: 1,
                  y: 0,

                  duration: 0.38,

                  stagger: {
                    each: 0.014,
                    from: "start",
                  },

                  ease: "power1.out",
                },
                0.36
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
   */

  return () => {
    media.revert();


    window.removeEventListener(
      "resize",
      handleViewportResize
    );


    section.style.removeProperty(
      "--service-canvas-height"
    );
  };
}