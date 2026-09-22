import { getVisitorId } from "./visitorId.js";
import { getAttribution } from "../leads/attribution.js";
import { hasAcceptedConsent } from "../consent/cookieConsent.js";


const STORAGE_KEY =
  "spozzer_session_id";

const EVENTS_API_URL =
  import.meta.env
    .PUBLIC_EVENTS_API_URL
    ?.trim();


/*
 * =========================================
 * "CAMADAS" RASTREADAS
 * =========================================
 *
 * Hero + About NÃO são rastreados separados:
 * são painéis sobrepostos, fixados num único
 * canvas controlado por scroll (ver
 * introExperience.js) — um IntersectionObserver
 * genérico não distingue "olhando o Hero" de
 * "olhando o About" porque os dois podem estar
 * "intersecting" ao mesmo tempo. Em vez disso,
 * o par inteiro vira uma única camada "intro":
 * do carregamento da página até o canvas ser
 * ultrapassado pelo scroll.
 *
 * As chaves abaixo precisam bater exatamente
 * com KNOWN_SECTION_IDS no Worker
 * (spozzer-api/src/index.js) e com
 * siteSectionIdEnum no CRM
 * (byspozzer-crm/packages/database/src/schema/analytics.ts).
 * Não existe pacote compartilhado entre os três
 * repositórios — a sincronia é manual.
 */

const TRACKED_SECTIONS = [
  { key: "intro", selector: "[data-intro-master]" },
  { key: "service", selector: "#servicos" },
  { key: "process", selector: "#processo" },
  { key: "testimonial", selector: "#depoimentos" },
  { key: "contact", selector: "#contato" },
];


function createRequestId(prefix) {
  if (
    typeof globalThis.crypto
      ?.randomUUID === "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 12),
    Math.random()
      .toString(36)
      .slice(2, 12),
  ].join("-");
}


/*
 * Retorna null sem consentimento aceito — mesma regra do visitorId,
 * nenhum identificador é criado antes da aceitação.
 */
function getSessionId() {
  if (!hasAcceptedConsent()) {
    return null;
  }

  try {
    const stored =
      sessionStorage.getItem(
        STORAGE_KEY
      );

    if (stored) {
      return stored;
    }
  } catch {
    // Storage indisponível — segue com um id não persistido.
  }

  const id =
    createRequestId("sess");

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      id
    );
  } catch {
    // Storage indisponível.
  }

  return id;
}


/*
 * Inicia o rastreamento de tempo por camada e
 * tempo total nesta página (só faz sentido em
 * index.astro, onde as seções existem), e
 * devolve `markFormSubmitted()` — contactExperience.js
 * chama isso ANTES de navegar para /obrigado, para
 * que o beacon disparado pelo pagehide da navegação
 * já saia com formSubmitted: true.
 *
 * O clique no WhatsApp acontece numa página
 * diferente (obrigado.astro, ver
 * sendWhatsappClickEvent abaixo) — é um beacon
 * separado, não algo que este objeto controla.
 *
 * Silenciosamente vira um no-op se
 * PUBLIC_EVENTS_API_URL não estiver
 * configurada (build sem a variável),
 * em vez de quebrar a página.
 */

export function initSessionTracking() {
  if (!EVENTS_API_URL) {
    return {
      markFormSubmitted: () => {},
    };
  }

  // Observando desde já é inofensivo (nenhum storage tocado, nenhuma rede
  // usada) — o que realmente depende de consentimento é gerar/ler os ids e
  // enviar o beacon, e isso só acontece dentro de send(), avaliado no
  // momento do envio. Assim, se a pessoa aceitar no meio da visita, o
  // beacon final sai corretamente identificado sem precisar reiniciar nada
  // aqui.
  const startedAt =
    Date.now();

  const state = new Map();

  for (
    const {
      key,
    } of TRACKED_SECTIONS
  ) {
    state.set(key, {
      enteredAt: null,
      totalMs: 0,
    });
  }


  let formSubmitted =
    false;

  let sent = false;


  const observer =
    new IntersectionObserver(
      (entries) => {
        for (
          const entry of entries
        ) {
          const key =
            entry.target
              .dataset
              .analyticsSectionKey;

          const bucket =
            state.get(key);

          if (!bucket) continue;

          if (
            entry.isIntersecting
          ) {
            if (
              bucket.enteredAt ===
              null
            ) {
              bucket.enteredAt =
                Date.now();
            }
          } else if (
            bucket.enteredAt !==
            null
          ) {
            bucket.totalMs +=
              Date.now() -
              bucket.enteredAt;

            bucket.enteredAt =
              null;
          }
        }
      },
      { threshold: 0 }
    );


  for (
    const {
      key,
      selector,
    } of TRACKED_SECTIONS
  ) {
    const element =
      document.querySelector(
        selector
      );

    if (!(element instanceof HTMLElement)) continue;

    element.dataset.analyticsSectionKey =
      key;

    observer.observe(
      element
    );
  }


  function finalizeSectionDurations() {
    const now =
      Date.now();

    const sectionDurations = {};


    for (
      const [
        key,
        bucket,
      ] of state
    ) {
      let totalMs =
        bucket.totalMs;

      // Uma camada ainda "aberta" no momento do
      // envio (o visitante estava olhando ela
      // quando a aba foi escondida/fechada) conta
      // o tempo até agora — nunca fica negativo
      // porque `now` é sempre >= enteredAt.
      if (
        bucket.enteredAt !==
        null
      ) {
        totalMs +=
          now -
          bucket.enteredAt;
      }

      sectionDurations[key] =
        Math.round(totalMs);
    }

    return sectionDurations;
  }


  function send() {
    if (sent) return;

    // Verificado aqui, não na inicialização: a pessoa pode aceitar o
    // consentimento a qualquer momento da visita, depois deste rastreamento
    // já ter começado a observar as seções.
    if (!hasAcceptedConsent()) return;

    const visitorId =
      getVisitorId();

    const sessionId =
      getSessionId();

    if (!visitorId || !sessionId) return;

    sent = true;

    observer.disconnect();

    const attribution =
      getAttribution();

    const now =
      Date.now();

    const payload = {
      requestId:
        createRequestId("session"),
      visitorId,
      sessionId,

      totalDurationMs:
        Math.max(
          0,
          now - startedAt
        ),

      sectionDurations:
        finalizeSectionDurations(),

      formSubmitted,

      // Nunca acontece nesta página — o clique no
      // WhatsApp só existe em /obrigado, num beacon
      // próprio (ver sendWhatsappClickEvent).
      whatsappClickAt: null,

      startedAt:
        new Date(
          startedAt
        ).toISOString(),

      endedAt:
        new Date(
          now
        ).toISOString(),

      ...attribution,
    };


    try {
      navigator.sendBeacon(
        EVENTS_API_URL,
        JSON.stringify(
          payload
        )
      );
    } catch {
      // Envio best-effort — uma falha aqui nunca deve
      // interromper a navegação do visitante.
    }
  }


  const handleVisibilityChange =
    () => {
      if (
        document
          .visibilityState ===
        "hidden"
      ) {
        send();
      }
    };


  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
  );

  window.addEventListener(
    "pagehide",
    send
  );


  return {
    markFormSubmitted() {
      formSubmitted = true;
    },
  };
}


/*
 * Beacon independente disparado em /obrigado.astro,
 * cobrindo os dois caminhos reais que levam ao
 * WhatsApp (redirecionamento automático por timeout
 * E o clique manual no link — ambos compartilham a
 * mesma URL e o mesmo elemento no script inline da
 * página, então uma única chamada guardada cobre
 * os dois).
 *
 * Reaproveita o mesmo sessionId de index.astro (via
 * sessionStorage, que sobrevive à navegação dentro
 * da mesma aba) para que o CRM consiga, na análise,
 * ligar esse clique à sessão de navegação que o
 * originou — mesmo sendo uma linha própria no D1,
 * já que esta é uma página/carregamento diferente.
 */

export function sendWhatsappClickEvent() {
  if (!EVENTS_API_URL) return;

  const visitorId =
    getVisitorId();

  const sessionId =
    getSessionId();

  // Sem consentimento, as duas funções acima já retornam null — sem
  // identificadores, não há o que enviar.
  if (!visitorId || !sessionId) return;

  const now =
    new Date().toISOString();

  const payload = {
    requestId:
      createRequestId("whatsapp"),

    visitorId,
    sessionId,

    totalDurationMs: 0,
    sectionDurations: {},

    // Só se chega em /obrigado depois de um envio
    // de formulário bem-sucedido (ver obrigado.astro).
    formSubmitted: true,

    whatsappClickAt: now,

    startedAt: now,
    endedAt: now,

    ...getAttribution(),
  };

  try {
    navigator.sendBeacon(
      EVENTS_API_URL,
      JSON.stringify(
        payload
      )
    );
  } catch {
    // Envio best-effort.
  }
}


export {
  EVENTS_API_URL,
};
