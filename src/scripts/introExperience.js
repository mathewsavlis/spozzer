import {
  gsap,
  ScrollTrigger,
} from "../lib/gsap.js";


const MOBILE_QUERY =
  "(max-width: 47.999rem)";


const REDUCED_MOTION_QUERY =
  "(prefers-reduced-motion: reduce)";


/*
 * =========================================
 * STABLE INTRO VIEWPORT
 * =========================================
 *
 * Hero + Portfolio + About usam o mesmo
 * canvas vertical no mobile.
 *
 * A altura do canvas é capturada no início
 * e não muda quando apenas a altura da
 * viewport muda por causa da toolbar.
 *
 * A área extra visível é tratada
 * separadamente através de:
 *
 * --intro-viewport-extension
 */

function initStableIntroViewport(
  master
) {
  const mobileQuery =
    window.matchMedia(
      MOBILE_QUERY
    );


  let stableWidth =
    window.innerWidth;


  let stableHeight =
    0;


  let resizeFrame =
    0;

  // A barra do navegador pode emitir vários eventos com a mesma altura.
  // Evita invalidar estilos quando a extensão visual não mudou.
  let appliedExtension = null;


  const getViewportHeight =
    () => {
      return Math.round(
        window.visualViewport?.height ??
        window.innerHeight
      );
    };


  /*
   * A geometria estável vem do small viewport
   * do CSS, não do visualViewport transitório.
   * Isso evita uma captura errada enquanto
   * a toolbar do Safari ainda está assentando.
   */
  const getStableViewportHeight =
    () => {
      if (
        !window.CSS?.supports?.(
          "height",
          "100svh"
        )
      ) {
        return getViewportHeight();
      }

      const probe =
        document.createElement("div");

      probe.style.cssText =
        "position:fixed;inset:0 auto auto 0;width:1px;height:100svh;visibility:hidden;pointer-events:none;contain:strict;";

      document.documentElement
        .appendChild(probe);

      const height = Math.round(
        probe.getBoundingClientRect()
          .height
      );

      probe.remove();

      return height > 0
        ? height
        : getViewportHeight();
    };


  /*
   * =========================================
   * CLEAR
   * =========================================
   */

  const clearMeasurements =
    () => {
      master.style.removeProperty(
        "--intro-canvas-height"
      );


      if (appliedExtension !== null) {
        master.style.removeProperty(
          "--intro-viewport-extension"
        );
        appliedExtension = null;
      }
    };


  /*
   * =========================================
   * VISUAL EXTENSION
   * =========================================
   *
   * Essa medida pode mudar com a toolbar.
   *
   * Ela NÃO participa do layout.
   */

  const updateExtension =
    () => {
      if (
        !mobileQuery.matches ||
        stableHeight <= 0
      ) {
        if (appliedExtension !== null) {
          master.style.removeProperty(
            "--intro-viewport-extension"
          );
          appliedExtension = null;
        }

        return;
      }


      const currentHeight =
        getViewportHeight();


      const extension =
        Math.max(
          0,
          currentHeight -
          stableHeight
        );


      if (extension !== appliedExtension) {
        master.style.setProperty(
          "--intro-viewport-extension",
          `${extension}px`
        );
        appliedExtension = extension;
      }
    };


  /*
   * =========================================
   * STABLE GEOMETRY
   * =========================================
   *
   * Essa medida só deve mudar quando
   * existe uma mudança REAL de viewport.
   */

  const captureGeometry =
    () => {
      if (
        !mobileQuery.matches
      ) {
        stableWidth =
          window.innerWidth;


        stableHeight =
          0;


        clearMeasurements();


        return;
      }


      stableWidth =
        window.innerWidth;


      stableHeight =
        getStableViewportHeight();


      master.style.setProperty(
        "--intro-canvas-height",
        `${stableHeight}px`
      );


      updateExtension();
    };


  /*
   * =========================================
   * RESIZE
   * =========================================
   */

  const handleResize =
    () => {
      cancelAnimationFrame(
        resizeFrame
      );


      resizeFrame =
        requestAnimationFrame(
          () => {
            const currentWidth =
              window.innerWidth;


            /*
             * Desktop não utiliza
             * o canvas mobile congelado.
             */

            if (
              !mobileQuery.matches
            ) {
              stableWidth =
                currentWidth;


              stableHeight =
                0;


              clearMeasurements();


              return;
            }


            /*
             * =================================
             * TOOLBAR / KEYBOARD
             * =================================
             *
             * A altura muda,
             * mas a largura permanece
             * praticamente igual.
             *
             * Portanto:
             *
             * canvas continua igual;
             * extensão visual é atualizada.
             */

            if (
              Math.abs(
                currentWidth -
                stableWidth
              ) < 20
            ) {
              updateExtension();


              return;
            }


            /*
             * =================================
             * REAL VIEWPORT CHANGE
             * =================================
             *
             * Mudança significativa de largura:
             *
             * portrait → landscape
             * landscape → portrait
             */

            captureGeometry();
          }
        );
    };


  /*
   * Primeira captura.
   */

  captureGeometry();


  window.addEventListener(
    "resize",
    handleResize,
    {
      passive: true,
    }
  );


  window.visualViewport
    ?.addEventListener(
      "resize",
      handleResize
    );


  /*
   * =========================================
   * PUBLIC API
   * =========================================
   */

  return {
    updateExtension,


    cleanup() {
      cancelAnimationFrame(
        resizeFrame
      );


      window.removeEventListener(
        "resize",
        handleResize
      );


      window.visualViewport
        ?.removeEventListener(
          "resize",
          handleResize
        );


      clearMeasurements();
    },
  };
}


/*
 * =========================================
 * HERO VIDEO PLAYBACK
 * =========================================
 */

function initHeroVideoPlayback(
  video
) {
  if (
    !(
      video instanceof
      HTMLVideoElement
    )
  ) {
    return () => { };
  }


  let destroyed =
    false;

  // Inicialmente visível; o observer passa a controlar a reprodução ao
  // sair/retornar à viewport sem tocar nas timelines de animação.
  let videoIsVisible = true;


  /*
   * =========================================
   * RESPONSIVE SOURCE
   * =========================================
   *
   * O HTML não possui mais <source>.
   *
   * Escolhemos UMA única mídia somente depois
   * que o JavaScript já conhece a viewport real.
   * Isso impede o preload scanner de considerar
   * simultaneamente os vídeos mobile e desktop.
   */

  const isMobile =
    window.matchMedia(
      MOBILE_QUERY
    ).matches;


  const source =
    isMobile
      ? video.dataset.mobileSrc
      : video.dataset.desktopSrc;


  const media =
    video.closest(
      ".hero-media"
    );


  const markPlaying =
    () => {
      video.dataset.playback =
        "playing";

      media?.classList.add(
        "is-video-playing"
      );
    };


  const markBlocked =
    () => {
      video.dataset.playback =
        "blocked";

      media?.classList.remove(
        "is-video-playing"
      );
    };


  if (!source) {
    video.dataset.playback =
      "missing-source";

    return () => { };
  }


  /*
   * A URL entra no elemento apenas aqui.
   * Até este ponto o navegador conhece somente
   * os data-attributes, que não disparam download.
   */

  video.src =
    source;


  /*
   * Reforçamos os requisitos
   * de autoplay também via JS.
   */

  video.autoplay =
    true;


  video.loop =
    true;


  video.muted =
    true;


  video.defaultMuted =
    true;


  video.controls =
    false;


  video.disablePictureInPicture =
    true;


  video.removeAttribute(
    "controls"
  );


  video.setAttribute(
    "disableRemotePlayback",
    ""
  );


  video.dataset.playback =
    "pending";


  video.playsInline =
    true;


  video.setAttribute(
    "muted",
    ""
  );


  video.setAttribute(
    "playsinline",
    ""
  );


  video.load();


  /*
   * =========================================
   * PLAY
   * =========================================
   */

  const attemptPlay =
    async () => {
      if (
        destroyed ||
        document.hidden ||
        !videoIsVisible
      ) {
        return false;
      }


      if (
        !video.paused &&
        !video.ended
      ) {
        markPlaying();


        return true;
      }


      try {
        await video.play();

        if (destroyed || document.hidden || !videoIsVisible) {
          video.pause();
          return false;
        }

        markPlaying();


        return true;
      } catch {
        /*
         * Safari/iOS pode bloquear autoplay.
         *
         * Não criamos loop infinito.
         * Apenas esperamos uma próxima
         * oportunidade legítima.
         */

        markBlocked();


        return false;
      }
    };


  /*
   * =========================================
   * EVENTS
   * =========================================
   */

  const handleUserGesture =
    () => {
      attemptPlay();
    };


  const handleVisibilityChange =
    () => {
      if (document.hidden) {
        video.pause();
      } else {
        attemptPlay();
      }
    };


  const handlePageShow =
    () => {
      attemptPlay();
    };


  const handleCanPlay =
    () => {
      attemptPlay();
    };


  const handlePlaying =
    () => {
      markPlaying();
    };


  /*
   * =========================================
   * VIEWPORT OBSERVER
   * =========================================
   */

  let observer =
    null;


  if (
    "IntersectionObserver" in window
  ) {
    observer =
      new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          videoIsVisible = Boolean(
            entry?.isIntersecting && entry.intersectionRatio >= 0.05
          );

          if (videoIsVisible) {
            attemptPlay();
          } else {
            video.pause();
          }
        },

        {
          threshold:
            0.05,
        }
      );


    observer.observe(
      video
    );
  }


  window.addEventListener(
    "pointerdown",
    handleUserGesture,
    {
      passive: true,
    }
  );


  window.addEventListener(
    "pageshow",
    handlePageShow
  );


  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
  );


  video.addEventListener(
    "canplay",
    handleCanPlay
  );


  video.addEventListener(
    "playing",
    handlePlaying
  );


  attemptPlay();


  /*
   * =========================================
   * CLEANUP
   * =========================================
   */

  return () => {
    if (
      destroyed
    ) {
      return;
    }


    destroyed =
      true;


    observer?.disconnect();


    window.removeEventListener(
      "pointerdown",
      handleUserGesture
    );


    window.removeEventListener(
      "pageshow",
      handlePageShow
    );


    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange
    );


    video.removeEventListener(
      "canplay",
      handleCanPlay
    );


    video.removeEventListener(
      "playing",
      handlePlaying
    );


    media?.classList.remove(
      "is-video-playing"
    );


    video.pause();

    video.removeAttribute(
      "src"
    );

    video.load();


    delete video.dataset.playback;
  };
}


/*
 * =========================================
 * ELEMENTS
 * =========================================
 */

function getExperienceElements(
  master
) {
  /*
   * HERO
   */

  const heroPanel =
    master.querySelector(
      "[data-intro-hero-panel]"
    );


  const heroStage =
    master.querySelector(
      "[data-hero-stage]"
    );


  const heroVideo =
    master.querySelector(
      "[data-hero-video]"
    );


  const heroContent =
    master.querySelector(
      "[data-hero-content]"
    );


  const heroItems = [
    ...master.querySelectorAll(
      "[data-hero-item]"
    ),
  ];


  const overlay =
    master.querySelector(
      "[data-hero-overlay]"
    );


  /*
   * PORTFOLIO
   */

  const portfolioHeader =
    master.querySelector(
      "[data-portfolio-header]"
    );


  const portfolioTitleContent =
    master.querySelector(
      "[data-portfolio-title-content]"
    );


  const portfolioViewport =
    master.querySelector(
      "[data-portfolio-input]"
    );


  const carouselTrack =
    master.querySelector(
      "[data-carousel-track]"
    );


  const carouselItems = [
    ...master.querySelectorAll(
      "[data-carousel-item]"
    ),
  ];


  const progressFill =
    master.querySelector(
      "[data-progress-fill]"
    );


  /*
   * ABOUT
   */

  const aboutStage =
    master.querySelector(
      "[data-about-stage]"
    );


  const aboutImage =
    master.querySelector(
      "[data-about-image]"
    );


  const aboutItems = [
    ...master.querySelectorAll(
      "[data-about-item]"
    ),
  ];


  const secondaryPhoto =
    master.querySelector(
      '[data-about-photo="secondary"]'
    );


  /*
   * =========================================
   * VALIDATION
   * =========================================
   */

  const requiredElements = [
    heroPanel,
    heroStage,
    heroContent,
    overlay,

    portfolioHeader,
    portfolioTitleContent,
    portfolioViewport,
    carouselTrack,
    progressFill,

    aboutStage,
    aboutImage,
    secondaryPhoto,
  ];


  const hasMissingElement =
    requiredElements.some(
      (element) => {
        return !(
          element instanceof
          HTMLElement
        );
      }
    );


  const hasMissingVideo =
    !(
      heroVideo instanceof
      HTMLVideoElement
    );


  const hasMissingCollections =
    heroItems.length === 0 ||
    carouselItems.length === 0 ||
    aboutItems.length === 0;


  if (
    hasMissingElement ||
    hasMissingVideo ||
    hasMissingCollections
  ) {
    return null;
  }


  return {
    heroPanel,
    heroStage,
    heroVideo,
    heroContent,
    heroItems,
    overlay,

    portfolioHeader,
    portfolioTitleContent,
    portfolioViewport,
    carouselTrack,
    carouselItems,
    progressFill,

    aboutStage,
    aboutImage,
    aboutItems,
    secondaryPhoto,
  };
}


/*
 * =========================================
 * ENHANCED MODE
 * =========================================
 */

function enableEnhancedMode({
  master,
  heroStage,
  aboutStage,
}) {
  master.classList.add(
    "is-enhanced",
    "is-viewport-active"
  );


  heroStage.classList.add(
    "is-enhanced"
  );


  aboutStage.classList.add(
    "is-enhanced"
  );


  return () => {
    master.classList.remove(
      "is-enhanced",
      "is-viewport-active"
    );


    heroStage.classList.remove(
      "is-enhanced"
    );


    aboutStage.classList.remove(
      "is-enhanced"
    );
  };
}


/*
 * =========================================
 * INTRO EXPERIENCE
 * =========================================
 */

export function initIntroExperience() {
  const master =
    document.querySelector(
      "[data-intro-master]"
    );


  if (
    !(
      master instanceof
      HTMLElement
    )
  ) {
    return () => { };
  }


  /*
   * =========================================
   * REDUCED MOTION
   * =========================================
   */

  const reducedMotion =
    window.matchMedia(
      REDUCED_MOTION_QUERY
    );


  if (
    reducedMotion.matches
  ) {
    return () => { };
  }


  /*
   * =========================================
   * ELEMENTS
   * =========================================
   */

  const elements =
    getExperienceElements(
      master
    );


  if (
    !elements
  ) {
    return () => { };
  }


  /*
   * =========================================
   * DESIGN TOKENS
   * =========================================
   *
   * A extensão visual usa exatamente
   * as cores já definidas no projeto.
   */

  const rootStyles =
    getComputedStyle(
      document.documentElement
    );


  const deepSurfaceColor =
    rootStyles
      .getPropertyValue(
        "--color-deep"
      )
      .trim() ||
    "#090909";


  const lightSurfaceColor =
    rootStyles
      .getPropertyValue(
        "--color-light"
      )
      .trim() ||
    "#f6f4f0";


  const {
    heroPanel,
    heroStage,
    heroVideo,
    heroContent,
    heroItems,
    overlay,

    portfolioHeader,
    portfolioTitleContent,
    portfolioViewport,
    carouselTrack,
    carouselItems,
    progressFill,

    aboutStage,
    aboutImage,
    aboutItems,
    secondaryPhoto,
  } = elements;


  /*
   * =========================================
   * STABLE MOBILE CANVAS
   * =========================================
   *
   * É definido ANTES do modo enhanced.
   *
   * Assim o ScrollTrigger já nasce usando
   * a geometria correta.
   */

  const stableViewport =
    initStableIntroViewport(
      master
    );


  /*
   * =========================================
   * ENHANCED MODE
   * =========================================
   */

  const disableEnhancedMode =
    enableEnhancedMode({
      master,
      heroStage,
      aboutStage,
    });


  /*
   * =========================================
   * HERO VIDEO
   * =========================================
   */

  const cleanupHeroVideo =
    initHeroVideoPlayback(
      heroVideo
    );


  /*
   * =========================================
   * DYNAMIC MEASUREMENTS
   * =========================================
   */

  const getHorizontalDistance =
    () => {
      const viewportWidth =
        portfolioViewport
          .clientWidth;


      const trackWidth =
        carouselTrack
          .scrollWidth;


      return -Math.max(
        0,
        trackWidth -
        viewportWidth
      );
    };


  /*
   * O heading do Portfolio também passa
   * a utilizar explicitamente o canvas
   * congelado através de master.clientHeight.
   */

  const getPortfolioHeaderLift =
    () => {

      const isDesktop =
        window.matchMedia(
          "(min-width: 48rem)"
        ).matches;


      const liftRatio =
        isDesktop
          ? 0.38
          : 0.405;


      return -(
        master.clientHeight *
        liftRatio
      );
    };


  const isMobile =
    window.matchMedia(
      MOBILE_QUERY
    ).matches;


  /*
   * =========================================
   * GSAP CONTEXT
   * =========================================
   */

  const context =
    gsap.context(
      () => {
        /*
         * =====================================
         * VIEWPORT SURFACE
         * =====================================
         */

        gsap.set(
          master,
          {
            "--intro-surface-color":
              deepSurfaceColor,
          }
        );


        /*
         * =====================================
         * HERO — INITIAL STATE
         * =====================================
         */

        gsap.set(
          heroContent,
          {
            y:
              0,

            clipPath:
              "inset(0% 0% 0% 0%)",
          }
        );


        gsap.set(
          heroItems,
          {
            autoAlpha:
              0,

            y:
              20,

            clipPath:
              "inset(100% 0% 0% 0%)",
          }
        );


        /*
         * =====================================
         * PORTFOLIO — INITIAL STATE
         * =====================================
         */

        gsap.set(
          portfolioHeader,
          {
            autoAlpha:
              0,

            y:
              20,

            clipPath:
              "inset(100% 0% 0% 0%)",
          }
        );


        gsap.set(
          portfolioTitleContent,
          {
            scale:
              1,

            transformOrigin:
              "center top",
          }
        );


        gsap.set(
          carouselTrack,
          {
            x:
              0,
          }
        );


        gsap.set(
          portfolioViewport,
          {
            pointerEvents:
              "none",
          }
        );


        gsap.set(
          carouselItems,
          {
            clipPath:
              "inset(100% 0% 0% 0%)",
          }
        );


        gsap.set(
          progressFill,
          {
            scaleX:
              0,

            transformOrigin:
              "left center",
          }
        );


        /*
         * =====================================
         * ABOUT — INITIAL STATE
         * =====================================
         */

        gsap.set(
          aboutImage,
          {
            autoAlpha:
              0,
          }
        );


        gsap.set(
          aboutItems,
          {
            autoAlpha:
              0,

            y:
              24,

            clipPath:
              "inset(0% 0% 100% 0%)",

            willChange:
              "transform, opacity, clip-path",
          }
        );


        gsap.set(
          secondaryPhoto,
          {
            autoAlpha:
              0,
          }
        );


        /*
         * =====================================
         * HERO LOAD ANIMATION
         * =====================================
         *
         * Continua independente do scroll.
         */

        const heroEntrance =
          gsap.to(
            heroItems,
            {
              autoAlpha:
                1,

              y:
                0,

              clipPath:
                "inset(0% 0% 0% 0%)",

              duration:
                1.2,

              stagger:
                0.15,

              ease:
                "power2.out",

              paused:
                true,
            }
          );


        let heroEntranceStarted =
          false;


        const startHeroEntrance =
          () => {
            if (
              heroEntranceStarted
            ) {
              return;
            }

            heroEntranceStarted =
              true;

            fontFallback.kill();

            heroEntrance.play(0);
          };


        const fontFallback =
          gsap.delayedCall(
            1.6,
            startHeroEntrance
          );


        if (
          document.fonts?.load
        ) {
          Promise.allSettled([
            document.fonts.load(
              '300 1rem "Cormorant Garamond"'
            ),
            document.fonts.load(
              '400 1rem "Italianno"'
            ),
            document.fonts.load(
              '300 1rem "Montserrat"'
            ),
          ]).then(
            startHeroEntrance
          );
        } else {
          startHeroEntrance();
        }


        /*
         * =====================================
         * MASTER TIMELINE
         * =====================================
         *
         * Continua sendo a única fonte
         * de verdade para:
         *
         * Hero
         * Portfolio
         * About
         */

        const timeline =
          gsap.timeline({
            defaults: {
              ease:
                "power2.inOut",
            },


            scrollTrigger: {
              trigger:
                master,

              start:
                "top top",

              end:
                "+=600%",

              pin:
                true,

              scrub:
                1,

              anticipatePin:
                1,

              invalidateOnRefresh:
                true,

              refreshPriority:
                10,


              /*
               * A cobertura extra só existe
               * enquanto a Intro está ativa.
               */

              onEnter: () => {
                master.classList.add(
                  "is-viewport-active"
                );


                stableViewport
                  .updateExtension();
              },


              onEnterBack: () => {
                master.classList.add(
                  "is-viewport-active"
                );


                stableViewport
                  .updateExtension();
              },


              onLeave: () => {
                master.classList.remove(
                  "is-viewport-active"
                );
              },
            },
          });


        /*
         * =====================================
         * LABELS
         * =====================================
         *
         * Nenhum timing foi refinado aqui.
         *
         * Estamos preservando os valores
         * atuais para mexer nisso depois.
         */

        timeline
          .addLabel(
            "heroExit",
            0
          )

          .addLabel(
            "portfolioReveal",
            0.8
          )

          .addLabel(
            "portfolioOpen",
            1.8
          )

          .addLabel(
            "carouselTravel",
            3.3
          )

          .addLabel(
            "carouselClose",
            7.5
          )

          .addLabel(
            "heroLeaves",
            7.8
          )

          .addLabel(
            "aboutImage",
            8
          )

          .addLabel(
            "aboutCopy",
            8.6
          )

          .addLabel(
            "aboutPhotoSwap",
            9.6
          );


        /*
         * =====================================
         * 01 — HERO CONTENT SAI
         * =====================================
         */

        timeline.to(
          heroContent,
          {
            y:
              -40,

            clipPath:
              "inset(100% 0% 0% 0%)",

            duration:
              1,
          },

          "heroExit"
        );

        /*
         * =====================================
         * PROFUNDIDADE DO PORTFOLIO
         * =====================================
         *
         * Quando o título do Portfolio começa
         * a aparecer:
         *
         * 1. o vídeo perde nitidez;
         * 2. o fundo escurece levemente;
         * 3. esse estado permanece até
         *    o Hero sair da tela.
         */

        timeline.to(
          heroVideo,
          isMobile
            ? {
                scale:
                  1.012,

                duration:
                  1,

                ease:
                  "power2.inOut",
              }
            : {
                filter:
                  "blur(7px)",

                scale:
                  1.025,

                duration:
                  1,

                ease:
                  "power2.inOut",
              },

          "portfolioReveal"
        );


        timeline.to(
          overlay,
          {
            backgroundColor:
              "rgba(0, 0, 0, 0.30)",

            duration:
              1,

            ease:
              "power2.inOut",
          },

          "portfolioReveal"
        );


        /*
         * =====================================
         * 02 — PORTFOLIO APARECE
         * =====================================
         */

        timeline.to(
          portfolioHeader,
          {
            autoAlpha:
              1,

            y:
              0,

            clipPath:
              "inset(0% 0% 0% 0%)",

            duration:
              1,

            ease:
              "power2.out",
          },

          "portfolioReveal"
        );


        /*
         * =====================================
         * 03 — HEADER SOBE
         * =====================================
         */

        timeline.to(
          portfolioHeader,
          {
            y:
              getPortfolioHeaderLift,

            duration:
              1.5,
          },

          "portfolioOpen"
        );


        timeline.to(
          portfolioTitleContent,
          {
            scale:
              0.65,

            duration:
              1.5,
          },

          "portfolioOpen"
        );


        timeline.set(
          portfolioViewport,
          {
            pointerEvents:
              "auto",
          },

          "portfolioOpen"
        );


        /*
         * =====================================
         * 04 — CARDS ABREM
         * =====================================
         */

        timeline.to(
          carouselItems,
          {
            clipPath:
              "inset(0% 0% 0% 0%)",

            duration:
              1.5,

            stagger:
              0.12,
          },

          "portfolioOpen"
        );


        /*
         * =====================================
         * 05 — HORIZONTAL SCROLL
         * =====================================
         */

        timeline.to(
          carouselTrack,
          {
            x:
              getHorizontalDistance,

            duration:
              4,

            ease:
              "none",
          },

          "carouselTravel"
        );


        timeline.to(
          progressFill,
          {
            scaleX:
              1,

            duration:
              4,

            ease:
              "none",
          },

          "carouselTravel"
        );


        timeline.set(
          portfolioViewport,
          {
            pointerEvents:
              "none",
          },

          "carouselClose"
        );


        /*
         * =====================================
         * 06 — CARDS FECHAM
         * =====================================
         */

        timeline.to(
          carouselItems,
          {
            clipPath:
              "inset(0% 0% 100% 0%)",

            duration:
              1,

            stagger:
              0.05,

            ease:
              "power3.inOut",
          },

          "carouselClose"
        );


        /*
         * =====================================
         * VIEWPORT SURFACE → ABOUT
         * =====================================
         *
         * Essa faixa não participa do layout.
         *
         * Quando o Hero começa a sair,
         * ela passa a usar o fundo do About.
         *
         * 0.01 mantém a mudança praticamente
         * instantânea e ainda reversível
         * pela master timeline.
         */

        timeline.to(
          master,
          {
            "--intro-surface-color":
              lightSurfaceColor,

            duration:
              0.01,

            ease:
              "none",
          },

          "heroLeaves"
        );


        /*
         * =====================================
         * 07 — HERO LAYER SOBE
         * =====================================
         */

        timeline.to(
          heroPanel,
          {
            yPercent:
              -100,

            duration:
              1.5,
          },

          "heroLeaves"
        );


        /*
         * =====================================
         * 08 — ABOUT IMAGE
         * =====================================
         */

        timeline.to(
          aboutImage,
          {
            autoAlpha:
              1,

            duration:
              1.2,
          },

          "aboutImage"
        );


        /*
         * =====================================
         * 09 — ABOUT COPY
         * =====================================
         */

        timeline.to(
          aboutItems,
          {
            autoAlpha:
              1,

            y:
              0,

            clipPath:
              "inset(0% 0% 0% 0%)",

            duration:
              1.15,

            stagger:
              0.22,

            ease:
              "power3.out",
          },

          "aboutCopy"
        );


        /*
         * =====================================
         * 10 — SECOND PHOTO
         * =====================================
         */

        timeline.to(
          secondaryPhoto,
          {
            autoAlpha:
              1,

            duration:
              1.5,

            ease:
              "power1.inOut",
          },

          "aboutPhotoSwap"
        );


        timeline.set(
          aboutItems,
          {
            willChange:
              "auto",
          },
          "aboutPhotoSwap"
        );
      },

      master
    );


  /*
   * =========================================
   * GUARDED INITIAL REFRESH
   * =========================================
   *
   * Mantemos a lógica que já estava
   * funcionando:
   *
   * depois que o usuário começa a scrollar,
   * não reconstruímos o pin.
   */

  let destroyed =
    false;


  let refreshFrame =
    0;


  const refresh =
    () => {
      if (
        destroyed
      ) {
        return;
      }


      if (
        window.scrollY > 2 ||
        ScrollTrigger.isScrolling()
      ) {
        return;
      }


      cancelAnimationFrame(
        refreshFrame
      );


      refreshFrame =
        requestAnimationFrame(
          () => {
            if (
              destroyed
            ) {
              return;
            }


            if (
              window.scrollY > 2 ||
              ScrollTrigger.isScrolling()
            ) {
              return;
            }


            ScrollTrigger.refresh();
          }
        );
    };


  /*
   * FONT METRICS
   */

  if (
    document.fonts?.ready
  ) {
    document.fonts.ready.then(
      refresh
    );
  }


  /*
   * ASSETS
   */

  if (
    document.readyState ===
    "complete"
  ) {
    refresh();
  } else {
    window.addEventListener(
      "load",
      refresh,
      {
        once: true,
      }
    );
  }


  /*
   * =========================================
   * CLEANUP
   * =========================================
   */

  return () => {
    if (
      destroyed
    ) {
      return;
    }


    destroyed =
      true;


    cancelAnimationFrame(
      refreshFrame
    );


    window.removeEventListener(
      "load",
      refresh
    );


    /*
     * Vídeo.
     */

    cleanupHeroVideo();


    /*
     * Timeline, tweens,
     * ScrollTrigger e pin.
     */

    context.revert();


    /*
     * Stable viewport.
     */

    stableViewport.cleanup();


    /*
     * Retorna ao fallback.
     */

    disableEnhancedMode();
  };
}