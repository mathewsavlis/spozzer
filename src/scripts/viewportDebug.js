const SELECTORS = [
    {
        name: "INTRO",
        selector: "[data-intro-master]",
    },
    {
        name: "HERO",
        selector: "[data-hero-stage]",
    },
    {
        name: "ABOUT",
        selector: "[data-about-stage]",
    },
    {
        name: "TESTIMONIALS",
        selector: "[data-testimonials]",
    },
    {
        name: "TEST STAGE",
        selector: "[data-testimonial-stage]",
    },
    {
        name: "SERVICE",
        selector: "[data-service]",
    },
    {
        name: "PROCESS",
        selector: "[data-process]",
    },
    {
        name: "CONTACT",
        selector: "[data-contact]",
    },
];


function round(value) {
    return Math.round(
        Number(value) || 0
    );
}


function createViewportMeasure(
    unit
) {
    const element =
        document.createElement("div");

    Object.assign(
        element.style,
        {
            position: "fixed",
            top: "0",
            left: "0",

            width: "0",
            height: `100${unit}`,

            visibility: "hidden",
            pointerEvents: "none",

            contain: "strict",
        }
    );

    document.body.appendChild(
        element
    );

    return element;
}


function getClosestSection() {
    const viewportHeight =
        window.visualViewport?.height ??
        window.innerHeight;

    const viewportCenter =
        viewportHeight / 2;

    let closest =
        null;

    let closestDistance =
        Infinity;

    SELECTORS.forEach(
        ({
            name,
            selector,
        }) => {
            const element =
                document.querySelector(
                    selector
                );

            if (
                !(
                    element instanceof
                    HTMLElement
                )
            ) {
                return;
            }

            const rect =
                element
                    .getBoundingClientRect();

            const center =
                rect.top +
                rect.height / 2;

            const distance =
                Math.abs(
                    center -
                    viewportCenter
                );

            if (
                distance <
                closestDistance
            ) {
                closestDistance =
                    distance;

                closest = {
                    name,
                    element,
                    rect,
                };
            }
        }
    );

    return closest;
}


function getSectionMetrics(
    selector
) {
    const element =
        document.querySelector(
            selector
        );

    if (
        !(
            element instanceof
            HTMLElement
        )
    ) {
        return null;
    }

    const rect =
        element
            .getBoundingClientRect();

    return {
        height:
            round(rect.height),

        top:
            round(rect.top),

        bottom:
            round(rect.bottom),
    };
}


export function initViewportDebug() {
    if (
        typeof window ===
        "undefined"
    ) {
        return () => { };
    }


    /*
     * Só ativa manualmente:
     *
     * ?viewport-debug=1
     */

    const params =
        new URLSearchParams(
            window.location.search
        );

    if (
        params.get(
            "viewport-debug"
        ) !== "1"
    ) {
        return () => { };
    }


    /*
     * =========================================
     * CSS VIEWPORT MEASURES
     * =========================================
     */

    const svhMeasure =
        createViewportMeasure(
            "svh"
        );

    const lvhMeasure =
        createViewportMeasure(
            "lvh"
        );

    const dvhMeasure =
        createViewportMeasure(
            "dvh"
        );

    const vhMeasure =
        createViewportMeasure(
            "vh"
        );


    /*
     * =========================================
     * PANEL
     * =========================================
     */

    const panel =
        document.createElement(
            "div"
        );

    Object.assign(
        panel.style,
        {
            position: "fixed",

            top:
                "max(8px, env(safe-area-inset-top))",

            left: "8px",

            zIndex:
                "2147483647",

            width:
                "min(92vw, 360px)",

            padding:
                "10px 12px",

            border:
                "1px solid rgba(255,255,255,.25)",

            borderRadius:
                "6px",

            background:
                "rgba(0,0,0,.82)",

            color:
                "#fff",

            fontFamily:
                "monospace",

            fontSize:
                "11px",

            lineHeight:
                "1.45",

            whiteSpace:
                "pre-wrap",

            pointerEvents:
                "none",

            WebkitBackdropFilter:
                "blur(8px)",

            backdropFilter:
                "blur(8px)",
        }
    );

    document.body.appendChild(
        panel
    );


    /*
     * =========================================
     * UPDATE
     * =========================================
     */

    let frame = 0;

    const update =
        () => {
            frame = 0;

            const visualViewport =
                window.visualViewport;

            const visualHeight =
                visualViewport
                    ? visualViewport.height
                    : window.innerHeight;

            const visualOffsetTop =
                visualViewport
                    ? visualViewport.offsetTop
                    : 0;

            const intro =
                getSectionMetrics(
                    "[data-intro-master]"
                );

            const about =
                getSectionMetrics(
                    "[data-about-stage]"
                );

            const testimonials =
                getSectionMetrics(
                    "[data-testimonials]"
                );

            const testimonialStage =
                getSectionMetrics(
                    "[data-testimonial-stage]"
                );

            const service =
                getSectionMetrics(
                    "[data-service]"
                );

            const contact =
                getSectionMetrics(
                    "[data-contact]"
                );

            const closest =
                getClosestSection();


            const documentWidth =
                document.documentElement
                    .scrollWidth;

            const viewportWidth =
                document.documentElement
                    .clientWidth;


            panel.textContent =
                `VIEWPORT DEBUG

section: ${closest?.name ?? "-"
                }

scrollY: ${round(window.scrollY)
                }

innerHeight: ${round(window.innerHeight)
                }

clientHeight: ${round(
                    document.documentElement
                        .clientHeight
                )
                }

visualHeight: ${round(visualHeight)
                }

visualOffsetTop: ${round(visualOffsetTop)
                }

--- CSS VIEWPORTS ---
100vh: ${round(
                    vhMeasure
                        .getBoundingClientRect()
                        .height
                )
                }

screen.height: ${round(
                    window.screen.height
                )
                }

screen.availHeight: ${round(
                    window.screen.availHeight
                )
                }

outerHeight: ${round(
                    window.outerHeight
                )
                }

100svh: ${round(
                    svhMeasure
                        .getBoundingClientRect()
                        .height
                )
                }

100lvh: ${round(
                    lvhMeasure
                        .getBoundingClientRect()
                        .height
                )
                }

100dvh: ${round(
                    dvhMeasure
                        .getBoundingClientRect()
                        .height
                )
                }

--- INTRO ---

master:
${intro
                    ? `h ${intro.height} | t ${intro.top} | b ${intro.bottom}`
                    : "-"}

about:
${about
                    ? `h ${about.height} | t ${about.top} | b ${about.bottom}`
                    : "-"}

--- TESTIMONIALS ---

section:
${testimonials
                    ? `h ${testimonials.height} | t ${testimonials.top} | b ${testimonials.bottom}`
                    : "-"}

stage:
${testimonialStage
                    ? `h ${testimonialStage.height} | t ${testimonialStage.top} | b ${testimonialStage.bottom}`
                    : "-"}

--- OTHER ---

service:
${service
                    ? `h ${service.height} | t ${service.top} | b ${service.bottom}`
                    : "-"}

contact:
${contact
                    ? `h ${contact.height} | t ${contact.top} | b ${contact.bottom}`
                    : "-"}

--- WIDTH ---

viewport: ${viewportWidth}
document: ${documentWidth}
overflow: ${documentWidth >
                    viewportWidth
                    ? documentWidth -
                    viewportWidth
                    : 0
                }px`;
        };


    const requestUpdate =
        () => {
            if (frame) {
                return;
            }

            frame =
                requestAnimationFrame(
                    update
                );
        };


    /*
     * Não chamamos:
     *
     * ScrollTrigger.refresh()
     * preventDefault()
     * scrollTo()
     *
     * Este arquivo SOMENTE observa.
     */

    window.addEventListener(
        "scroll",
        requestUpdate,
        {
            passive: true,
        }
    );

    window.addEventListener(
        "resize",
        requestUpdate,
        {
            passive: true,
        }
    );


    window.visualViewport
        ?.addEventListener(
            "resize",
            requestUpdate
        );

    window.visualViewport
        ?.addEventListener(
            "scroll",
            requestUpdate
        );


    update();


    /*
     * =========================================
     * CLEANUP
     * =========================================
     */

    return () => {
        cancelAnimationFrame(
            frame
        );

        window.removeEventListener(
            "scroll",
            requestUpdate
        );

        window.removeEventListener(
            "resize",
            requestUpdate
        );

        window.visualViewport
            ?.removeEventListener(
                "resize",
                requestUpdate
            );

        window.visualViewport
            ?.removeEventListener(
                "scroll",
                requestUpdate
            );

        panel.remove();

        vhMeasure.remove();
        svhMeasure.remove();
        lvhMeasure.remove();
        dvhMeasure.remove();
    };
}