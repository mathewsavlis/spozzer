import { hasAcceptedConsent } from "../consent/cookieConsent.js";

const STORAGE_KEY =
  "spozzer_visitor_id";


/*
 * =========================================
 * VISITOR ID
 * =========================================
 *
 * Um id longo-prazo (localStorage, não
 * sessionStorage) que identifica o mesmo
 * navegador entre visitas.
 *
 * Enviado tanto em /leads (submitLead.js)
 * quanto em /events (session.js) — é a
 * chave que o CRM usa para ligar uma sessão
 * de navegação ao lead que ela eventualmente
 * gerou, sem depender de nome/telefone/e-mail.
 *
 * localStorage pode estar indisponível
 * (modo privado estrito, storage bloqueado).
 * Nesse caso, geramos um id novo por chamada —
 * pior caso é "parece um visitante novo toda
 * vez", nunca um erro.
 */

function createVisitorId() {
  if (
    typeof globalThis.crypto
      ?.randomUUID === "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  return [
    "visitor",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 12),
    Math.random()
      .toString(36)
      .slice(2, 12),
  ].join("-");
}


let cachedVisitorId = null;


/*
 * Retorna null sem consentimento aceito — nunca cria nem lê o id
 * persistido nesse caso, então nenhum identificador de navegador chega
 * a existir antes da pessoa aceitar.
 */
export function getVisitorId() {
  if (!hasAcceptedConsent()) {
    return null;
  }

  if (cachedVisitorId) {
    return cachedVisitorId;
  }

  try {
    const stored =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (stored) {
      cachedVisitorId = stored;
      return cachedVisitorId;
    }
  } catch {
    // Storage indisponível — segue para gerar um novo, só que não persistido.
  }

  const id =
    createVisitorId();

  try {
    localStorage.setItem(
      STORAGE_KEY,
      id
    );
  } catch {
    // Storage indisponível — id vale só para esta chamada.
  }

  cachedVisitorId = id;
  return cachedVisitorId;
}
