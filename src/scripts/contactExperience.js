import { gsap } from "../lib/gsap.js";

import {
  validateLead,
} from "../lib/leads/validateLead.js";

import {
  submitLead,
} from "../lib/leads/submitLead.js";


const MOBILE_QUERY =
  "(max-width: 47.999rem)";

const DESKTOP_QUERY =
  "(min-width: 48rem)";

const REDUCED_MOTION_QUERY =
  "(prefers-reduced-motion: reduce)";


export function initContactExperience() {
  const section =
    document.querySelector(
      "[data-contact]"
    );


  if (
    !(section instanceof HTMLElement)
  ) {
    return () => {};
  }


  const form =
    section.querySelector(
      "[data-contact-form]"
    );

  const submitButton =
    section.querySelector(
      "[data-contact-submit]"
    );

  const submitLabel =
    section.querySelector(
      "[data-submit-label]"
    );

  const status =
    section.querySelector(
      "[data-form-status]"
    );


  if (
    !(form instanceof HTMLFormElement) ||
    !(
      submitButton instanceof
      HTMLButtonElement
    )
  ) {
    return () => {};
  }


  /*
   * =========================================
   * STABLE MOBILE VIEWPORT
   * =========================================
   *
   * O Contact NÃO recebe uma height fixa.
   *
   * Congelamos somente a altura mínima
   * de referência usada pelo layout.
   *
   * Assim:
   *
   * toolbar aparece/desaparece
   * → composição não recalcula
   *
   * formulário precisa crescer
   * → section continua podendo crescer
   *
   * teclado abre
   * → não redefine a geometria da section
   */

  const mobileViewportQuery =
    window.matchMedia(
      MOBILE_QUERY
    );


  let stableViewportWidth =
    window.innerWidth;


  const setStableContactHeight =
    () => {
      /*
       * Desktop não utiliza
       * a variável mobile.
       */
      if (
        !mobileViewportQuery.matches
      ) {
        section.style.removeProperty(
          "--contact-stable-height"
        );

        return;
      }


      /*
       * Capturamos a altura útil
       * somente quando uma geometria
       * válida precisa ser estabelecida.
       */
      const height =
        Math.round(
          window.visualViewport
            ?.height ??
          window.innerHeight
        );


      /*
       * Guardamos também a largura.
       *
       * Ela será usada para diferenciar:
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
        "--contact-stable-height",
        `${height}px`
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
          "--contact-stable-height"
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
       * Safari altera fortemente
       * a altura da viewport quando:
       *
       * - barra aparece;
       * - barra desaparece;
       * - teclado abre.
       *
       * Mas a largura permanece
       * praticamente igual.
       *
       * Nesses casos NÃO recalculamos
       * a altura estável.
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
       * Se a largura mudou de forma
       * relevante, normalmente tivemos:
       *
       * portrait → landscape
       * ou
       * landscape → portrait.
       *
       * Agora uma nova medição é válida.
       */

      setStableContactHeight();
    };


  /*
   * Primeira captura.
   */

  setStableContactHeight();


  window.addEventListener(
    "resize",
    handleViewportResize,
    {
      passive: true,
    }
  );


  /*
   * =========================================
   * FORM STATE
   * =========================================
   */

  const setState =
    (
      state,
      message = ""
    ) => {
      form.dataset.state =
        state;


      const loading =
        state === "loading";


      submitButton.disabled =
        loading;


      submitButton.setAttribute(
        "aria-busy",
        loading
          ? "true"
          : "false"
      );


      if (submitLabel) {
        submitLabel.textContent =
          loading
            ? "ENVIANDO..."
            : "INICIAR PROJETO";
      }


      if (status) {
        status.textContent =
          message;
      }
    };


  /*
   * =========================================
   * ERRORS
   * =========================================
   */

  const clearErrors =
    () => {
      form
        .querySelectorAll(
          '[aria-invalid="true"]'
        )
        .forEach(
          (field) => {
            field.removeAttribute(
              "aria-invalid"
            );
          }
        );


      section
        .querySelectorAll(
          "[data-error-for]"
        )
        .forEach(
          (element) => {
            element.textContent =
              "";
          }
        );
    };


  const showErrors =
    (errors) => {
      Object.entries(
        errors
      ).forEach(
        ([
          fieldName,
          message,
        ]) => {
          const field =
            form.elements.namedItem(
              fieldName
            );


          const error =
            section.querySelector(
              `[data-error-for="${fieldName}"]`
            );


          if (
            field instanceof
            HTMLElement
          ) {
            field.setAttribute(
              "aria-invalid",
              "true"
            );
          }


          if (error) {
            error.textContent =
              message;
          }
        }
      );


      const firstField =
        Object.keys(
          errors
        )[0];


      form.elements
        .namedItem(
          firstField
        )
        ?.focus?.();
    };


  /*
   * =========================================
   * SUBMIT
   * =========================================
   */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();


      if (
        form.dataset.state ===
        "loading"
      ) {
        return;
      }


      clearErrors();


      const formData =
        new FormData(
          form
        );


      const rawLead = {
        name:
          String(
            formData.get(
              "name"
            ) ?? ""
          ),

        email:
          String(
            formData.get(
              "email"
            ) ?? ""
          ),

        phone:
          String(
            formData.get(
              "phone"
            ) ?? ""
          ),

        message:
          String(
            formData.get(
              "message"
            ) ?? ""
          ),

        website:
          String(
            formData.get(
              "website"
            ) ?? ""
          ),
      };


      const validation =
        validateLead(
          rawLead
        );


      if (
        !validation.valid
      ) {
        showErrors(
          validation.errors
        );


        setState(
          "error",
          "Revise os campos destacados."
        );


        return;
      }


      setState(
        "loading",
        "Registrando seu projeto..."
      );


      try {
        const result =
          await submitLead(
            validation.normalized
          );


        setState(
          "success",
          "Cadastro concluído."
        );


        window.location.assign(
          result.redirectUrl ||
          "/obrigado"
        );
      } catch (error) {
        if (
          error.fields &&
          typeof error.fields ===
            "object"
        ) {
          showErrors(
            error.fields
          );
        }


        setState(
          "error",
          "Não foi possível enviar agora. Seus dados continuam preenchidos. Tente novamente."
        );
      }
    };


  form.addEventListener(
    "submit",
    handleSubmit
  );


  /*
   * =========================================
   * MOTION
   * =========================================
   */

  let motionCleanup =
    () => {};


  if (
    !window
      .matchMedia(
        REDUCED_MOTION_QUERY
      )
      .matches
  ) {
    const eyebrow =
      section.querySelector(
        ".contact__eyebrow"
      );

    const title =
      section.querySelector(
        ".contact__title"
      );

    const description =
      section.querySelector(
        ".contact__description"
      );

    const fields = [
      ...section.querySelectorAll(
        ".contact-form__field"
      ),
    ];

    const footer =
      section.querySelector(
        ".contact-form__footer"
      );


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
               * Mantemos por enquanto o modelo
               * one-shot já validado.
               *
               * A alteração desta rodada é somente
               * de estabilidade da viewport.
               */

              if (
                conditions.mobile
              ) {
                /*
                 * EYEBROW
                 */

                if (eyebrow) {
                  gsap.set(
                    eyebrow,
                    {
                      autoAlpha:
                        0,

                      y:
                        10,

                      willChange:
                        "transform, opacity",
                    }
                  );
                }


                /*
                 * TITLE
                 */

                if (title) {
                  gsap.set(
                    title,
                    {
                      autoAlpha:
                        0,

                      y:
                        18,

                      clipPath:
                        "inset(0% 0% 100% 0%)",

                      willChange:
                        "transform, opacity, clip-path",
                    }
                  );
                }


                /*
                 * DESCRIPTION
                 */

                if (description) {
                  gsap.set(
                    description,
                    {
                      autoAlpha:
                        0,

                      y:
                        12,

                      willChange:
                        "transform, opacity",
                    }
                  );
                }


                /*
                 * FIELDS
                 */

                gsap.set(
                  fields,
                  {
                    autoAlpha:
                      0,

                    y:
                      14,

                    willChange:
                      "transform, opacity",
                  }
                );


                /*
                 * FOOTER
                 */

                if (footer) {
                  gsap.set(
                    footer,
                    {
                      autoAlpha:
                        0,

                      y:
                        10,

                      willChange:
                        "transform, opacity",
                    }
                  );
                }


                /*
                 * MOBILE TIMELINE
                 */

                const timeline =
                  gsap.timeline({
                    scrollTrigger: {
                      trigger:
                        section,

                      start:
                        "top 90%",

                      once:
                        true,
                    },
                  });


                /*
                 * EYEBROW
                 */

                if (eyebrow) {
                  timeline.to(
                    eyebrow,
                    {
                      autoAlpha:
                        1,

                      y:
                        0,

                      duration:
                        0.34,

                      ease:
                        "power2.out",
                    },

                    0
                  );
                }


                /*
                 * TITLE
                 */

                if (title) {
                  timeline.to(
                    title,
                    {
                      autoAlpha:
                        1,

                      y:
                        0,

                      clipPath:
                        "inset(0% 0% 0% 0%)",

                      duration:
                        0.58,

                      ease:
                        "power3.out",
                    },

                    0.06
                  );
                }


                /*
                 * DESCRIPTION
                 */

                if (description) {
                  timeline.to(
                    description,
                    {
                      autoAlpha:
                        1,

                      y:
                        0,

                      duration:
                        0.42,

                      ease:
                        "power2.out",
                    },

                    0.2
                  );
                }


                /*
                 * FORM FIELDS
                 */

                timeline.to(
                  fields,
                  {
                    autoAlpha:
                      1,

                    y:
                      0,

                    duration:
                      0.38,

                    stagger:
                      0.07,

                    ease:
                      "power2.out",
                  },

                  0.3
                );


                /*
                 * FOOTER
                 */

                if (footer) {
                  timeline.to(
                    footer,
                    {
                      autoAlpha:
                        1,

                      y:
                        0,

                      duration:
                        0.36,

                      ease:
                        "power2.out",
                    },

                    0.68
                  );
                }


                return;
              }


              /*
               * =====================================
               * DESKTOP
               * =====================================
               *
               * Preserva o reveal reversível
               * ligado ao progresso do scroll.
               */

              if (eyebrow) {
                gsap.set(
                  eyebrow,
                  {
                    autoAlpha:
                      0,

                    y:
                      8,
                  }
                );
              }


              if (title) {
                gsap.set(
                  title,
                  {
                    autoAlpha:
                      0,

                    y:
                      14,

                    clipPath:
                      "inset(0% 0% 100% 0%)",
                  }
                );
              }


              if (description) {
                gsap.set(
                  description,
                  {
                    autoAlpha:
                      0,

                    y:
                      10,
                  }
                );
              }


              gsap.set(
                fields,
                {
                  autoAlpha:
                    0,

                  y:
                    12,
                }
              );


              if (footer) {
                gsap.set(
                  footer,
                  {
                    autoAlpha:
                      0,

                    y:
                      10,
                  }
                );
              }


              /*
               * DESKTOP TIMELINE
               */

              const timeline =
                gsap.timeline({
                  scrollTrigger: {
                    trigger:
                      section,

                    start:
                      "top 62%",

                    end:
                      "top 8%",

                    scrub:
                      0.72,

                    invalidateOnRefresh:
                      true,

                    refreshPriority:
                      -20,
                  },
                });


              /*
               * EYEBROW
               */

              if (eyebrow) {
                timeline.to(
                  eyebrow,
                  {
                    autoAlpha:
                      1,

                    y:
                      0,

                    duration:
                      0.16,

                    ease:
                      "power2.out",
                  },

                  0
                );
              }


              /*
               * TITLE
               */

              if (title) {
                timeline.to(
                  title,
                  {
                    autoAlpha:
                      1,

                    y:
                      0,

                    clipPath:
                      "inset(0% 0% 0% 0%)",

                    duration:
                      0.28,

                    ease:
                      "power3.out",
                  },

                  0.08
                );
              }


              /*
               * DESCRIPTION
               */

              if (description) {
                timeline.to(
                  description,
                  {
                    autoAlpha:
                      1,

                    y:
                      0,

                    duration:
                      0.22,

                    ease:
                      "power2.out",
                  },

                  0.22
                );
              }


              /*
               * FIELDS
               */

              timeline.to(
                fields,
                {
                  autoAlpha:
                    1,

                  y:
                    0,

                  duration:
                    0.18,

                  stagger:
                    0.055,

                  ease:
                    "power2.out",
                },

                0.34
              );


              /*
               * FOOTER
               */

              if (footer) {
                timeline.to(
                  footer,
                  {
                    autoAlpha:
                      1,

                    y:
                      0,

                    duration:
                      0.2,

                    ease:
                      "power2.out",
                  },

                  0.72
                );
              }
            },

            section
          );


        return () => {
          context.revert();
        };
      }
    );


    motionCleanup =
      () => {
        media.revert();
      };
  }


  /*
   * =========================================
   * CLEANUP
   * =========================================
   *
   * Fundamental para Astro HMR:
   *
   * - remove submit listener;
   * - remove viewport listener;
   * - remove CSS variable;
   * - destrói timelines / ScrollTriggers.
   */

  return () => {
    form.removeEventListener(
      "submit",
      handleSubmit
    );


    window.removeEventListener(
      "resize",
      handleViewportResize
    );


    section.style.removeProperty(
      "--contact-stable-height"
    );


    motionCleanup();
  };
}