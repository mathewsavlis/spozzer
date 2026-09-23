import {
  gsap,
} from "../lib/gsap.js";

import {
  createHorizontalDrag,
} from "../lib/interactions/horizontalDrag.js";


const DESKTOP_QUERY =
  "(min-width: 48rem)";


const REDUCED_MOTION_QUERY =
  "(prefers-reduced-motion: reduce)";


const clamp = (
  value,
  min,
  max
) =>
  Math.min(
    max,
    Math.max(
      min,
      value
    )
  );


function addMediaListener(
  mediaQuery,
  handler
) {

  mediaQuery.addEventListener?.(
    "change",
    handler
  );


  return () => {

    mediaQuery.removeEventListener?.(
      "change",
      handler
    );

  };

}


export function initTestimonials() {

  const section =
    document.querySelector(
      "[data-testimonials]"
    );


  if (
    !(section instanceof HTMLElement)
  ) {
    return () => { };
  }


  const stage =
    section.querySelector(
      "[data-testimonial-stage]"
    );


  const cards = [
    ...section.querySelectorAll(
      "[data-testimonial-card]"
    ),
  ];


  const darknessLayers = [
    ...section.querySelectorAll(
      "[data-card-darkness]"
    ),
  ];


  const previousButton =
    section.querySelector(
      "[data-testimonial-prev]"
    );


  const nextButton =
    section.querySelector(
      "[data-testimonial-next]"
    );


  if (
    !(stage instanceof HTMLElement) ||
    cards.length === 0
  ) {
    return () => { };
  }

  const mobileQuery =
    window.matchMedia(
      "(max-width: 47.999rem)"
    );

  let stableViewportWidth =
    window.innerWidth;


  const setStableCanvasHeight =
    () => {
      if (!mobileQuery.matches) {
        section.style.removeProperty(
          "--testimonial-canvas-height"
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
        "--testimonial-canvas-height",
        `${height}px`
      );
    };


  setStableCanvasHeight();


  const desktopQuery =
    window.matchMedia(
      DESKTOP_QUERY
    );


  const reducedMotionQuery =
    window.matchMedia(
      REDUCED_MOTION_QUERY
    );


  const lastIndex =
    cards.length - 1;


  /*
   * =========================================
   * PLAYHEAD
   * =========================================
   */

  const playhead = {
    position: 0,
  };


  let dragStartPosition = 0;

  let suppressClick = false;


  /*
   * =========================================
   * RENDER
   * =========================================
   */

  const render =
    () => {

      const desktop =
        desktopQuery.matches;


      const offset =
        desktop
          ? 92
          : 96;


      const sideScale =
        desktop
          ? 0.8
          : 0.82;


      const closestIndex =
        Math.round(
          playhead.position
        );


      cards.forEach(
        (
          card,
          index
        ) => {

          const difference =
            index -
            playhead.position;


          const distance =
            Math.abs(
              difference
            );


          const normalizedDistance =
            Math.min(
              distance,
              1
            );


          const xPercent =
            -50 +
            difference * offset;


          const scale =
            1 -
            (
              1 - sideScale
            ) *
            normalizedDistance;


          const yPercent =
            -50 -
            (
              normalizedDistance * 2
            );


          const opacity =
            distance <= 1
              ? 1 -
              (
                distance * 0.45
              )
              : Math.max(
                0,
                0.55 -
                (
                  distance - 1
                ) *
                0.9
              );


          gsap.set(
            card,
            {
              xPercent,
              yPercent,

              scale,

              rotationY:
                clamp(
                  difference * -6,
                  -12,
                  12
                ),

              rotationZ:
                clamp(
                  difference * -1.5,
                  -3,
                  3
                ),

              z:
                -150 *
                normalizedDistance,

              autoAlpha:
                opacity,

              zIndex:
                1000 -
                Math.round(
                  distance * 100
                ),
            }
          );


          const darkness =
            darknessLayers[index];


          if (darkness) {

            gsap.set(
              darkness,
              {
                opacity:
                  Math.min(
                    0.76,
                    distance * 0.76
                  ),
              }
            );

          }


          const isActive =
            index ===
            closestIndex;


          const ariaHidden = isActive ? "false" : "true";
          if (card.getAttribute("aria-hidden") !== ariaHidden) {
            card.setAttribute("aria-hidden", ariaHidden);
          }

          const pointerEvents = distance <= 1.1 ? "auto" : "none";
          if (card.style.pointerEvents !== pointerEvents) {
            card.style.pointerEvents = pointerEvents;
          }

        }
      );


      if (
        previousButton instanceof
        HTMLButtonElement
      ) {

        const disabled = playhead.position <= 0.001;
        if (previousButton.disabled !== disabled) {
          previousButton.disabled = disabled;
        }

      }


      if (
        nextButton instanceof
        HTMLButtonElement
      ) {

        const disabled = playhead.position >= lastIndex - 0.001;
        if (nextButton.disabled !== disabled) {
          nextButton.disabled = disabled;
        }

      }

    };


  /*
   * =========================================
   * ANIMATION
   * =========================================
   */

  const animateTo =
    (
      position,
      duration = 0.65
    ) => {

      const destination =
        clamp(
          position,
          0,
          lastIndex
        );


      gsap.killTweensOf(
        playhead
      );


      gsap.to(
        playhead,
        {
          position:
            destination,

          duration:
            reducedMotionQuery.matches
              ? 0
              : duration,

          ease:
            "power3.out",

          overwrite:
            true,

          onUpdate:
            render,

          onComplete:
            render,
        }
      );

    };


  const getCurrentIndex =
    () =>
      Math.round(
        playhead.position
      );


  const next =
    () =>
      animateTo(
        getCurrentIndex() + 1
      );


  const previous =
    () =>
      animateTo(
        getCurrentIndex() - 1
      );


  /*
   * =========================================
   * BUTTONS
   * =========================================
   */

  const handleNext =
    () => next();


  const handlePrevious =
    () => previous();


  nextButton?.addEventListener(
    "click",
    handleNext
  );


  previousButton?.addEventListener(
    "click",
    handlePrevious
  );


  /*
   * =========================================
   * CARD CLICK
   * =========================================
   */

  const cardHandlers =
    cards.map(
      (
        card,
        index
      ) => {

        const handler =
          () => {

            if (suppressClick) {
              return;
            }


            animateTo(
              index
            );

          };


        card.addEventListener(
          "click",
          handler
        );


        return handler;

      }
    );


  /*
   * =========================================
   * KEYBOARD
   * =========================================
   */

  const handleKeydown =
    (event) => {

      if (
        event.code ===
        "ArrowRight" ||
        event.code ===
        "KeyD"
      ) {

        event.preventDefault();

        next();

        return;

      }


      if (
        event.code ===
        "ArrowLeft" ||
        event.code ===
        "KeyA"
      ) {

        event.preventDefault();

        previous();

      }

    };


  stage.addEventListener(
    "keydown",
    handleKeydown
  );


  /*
   * =========================================
   * DRAG
   * =========================================
   */

  let dragStep = 300;


  const updateDragStep =
    () => {
      const cardWidth =
        cards[0]
          ?.getBoundingClientRect()
          .width ?? 300;

      dragStep =
        cardWidth *
        (
          desktopQuery.matches
            ? 0.92
            : 0.96
        );
    };


  const removeDrag =
    createHorizontalDrag(
      stage,
      {

        onStart() {

          gsap.killTweensOf(
            playhead
          );


          updateDragStep();


          dragStartPosition =
            playhead.position;


          suppressClick =
            true;


          stage.classList.add(
            "is-dragging"
          );

        },


        onMove({
          deltaX,
        }) {

          playhead.position =
            clamp(
              dragStartPosition -
              deltaX / dragStep,

              0,
              lastIndex
            );


          render();

        },


        onEnd({
          deltaX,
        }) {

          stage.classList.remove(
            "is-dragging"
          );


          /*
           * Um gesto intencional recebe
           * pequena preferência direcional.
           */

          const strongGesture =
            Math.abs(deltaX) >
            dragStep * 0.12;


          let destination =
            Math.round(
              playhead.position
            );


          if (strongGesture) {

            destination =
              deltaX < 0
                ? Math.ceil(
                  playhead.position
                )
                : Math.floor(
                  playhead.position
                );

          }


          animateTo(
            destination
          );


          /*
           * Click acontece depois
           * do pointerup.
           *
           * Liberamos no próximo frame.
           */

          requestAnimationFrame(
            () => {

              suppressClick =
                false;

            }
          );

        },

      }
    );


  /*
   * =========================================
   * RESPONSIVE
   * =========================================
   */

  const handleEnvironmentChange =
    () => {

      gsap.killTweensOf(
        playhead
      );


      playhead.position =
        Math.round(
          playhead.position
        );


      updateDragStep();
      render();

    };

  const handleViewportResize =
    () => {
      const currentWidth =
        window.innerWidth;

      /*
       * Toolbar e teclado normalmente
       * alteram altura, mas não largura.
       *
       * Só reconstruímos o canvas se
       * a largura realmente mudou.
       */
      if (
        Math.abs(
          currentWidth -
          stableViewportWidth
        ) < 20
      ) {
        return;
      }

      setStableCanvasHeight();

      requestAnimationFrame(() => {
        updateDragStep();
        render();
      });
    };


  window.addEventListener(
    "resize",
    handleViewportResize,
    {
      passive: true,
    }
  );

  const removeDesktopListener =
    addMediaListener(
      desktopQuery,
      handleEnvironmentChange
    );


  const removeMotionListener =
    addMediaListener(
      reducedMotionQuery,
      handleEnvironmentChange
    );


  /*
   * =========================================
   * INIT
   * =========================================
   */

  section.classList.add(
    "is-enhanced"
  );


  updateDragStep();
  render();


  /*
   * =========================================
   * CLEANUP
   * =========================================
   */

  return () => {

    window.removeEventListener(
      "resize",
      handleViewportResize
    );

    section.style.removeProperty(
      "--testimonial-canvas-height"
    );

    gsap.killTweensOf(
      playhead
    );


    removeDrag();

    removeDesktopListener();

    removeMotionListener();


    nextButton?.removeEventListener(
      "click",
      handleNext
    );


    previousButton?.removeEventListener(
      "click",
      handlePrevious
    );


    stage.removeEventListener(
      "keydown",
      handleKeydown
    );


    cards.forEach(
      (
        card,
        index
      ) => {

        card.removeEventListener(
          "click",
          cardHandlers[index]
        );


        card.removeAttribute(
          "aria-hidden"
        );


        card.style.removeProperty(
          "pointer-events"
        );

      }
    );


    gsap.set(
      cards,
      {
        clearProps:
          "transform,opacity,visibility,zIndex",
      }
    );


    gsap.set(
      darknessLayers,
      {
        clearProps:
          "opacity",
      }
    );


    stage.classList.remove(
      "is-dragging"
    );


    section.classList.remove(
      "is-enhanced"
    );

  };

}