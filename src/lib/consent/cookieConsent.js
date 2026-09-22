const STORAGE_KEY =
  "spozzer_cookie_consent";


/*
 * =========================================
 * CONSENTIMENTO DE COOKIES
 * =========================================
 *
 * Opt-in, não opt-out: enquanto não houver
 * uma decisão explícita, o padrão é NÃO
 * rastrear (nem GTM, nem analytics próprio).
 *
 * "accepted" | "declined" | null (ainda
 * não decidiu).
 */

export function getConsent() {
  try {
    const value =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (
      value === "accepted" ||
      value === "declined"
    ) {
      return value;
    }
  } catch {
    // Storage indisponível — trata como "ainda não decidiu".
  }

  return null;
}


export function hasAcceptedConsent() {
  return getConsent() === "accepted";
}


function persistConsent(value) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      value
    );
  } catch {
    // Storage indisponível — a decisão vale só para esta visita.
  }
}


export function acceptConsent() {
  persistConsent("accepted");

  document.dispatchEvent(
    new Event(
      "spozzer:consent-accepted"
    )
  );
}


export function declineConsent() {
  persistConsent("declined");
}


/*
 * GTM é a única peça que precisa ser
 * "ligada" no exato momento da aceitação
 * (é um script de cabeçalho, carregado uma
 * vez). O restante do rastreamento (visitor
 * id, beacons de sessão) verifica o
 * consentimento no momento em que de fato
 * cria/envia algo, então funciona
 * corretamente mesmo que a decisão venha
 * no meio da visita, sem precisar de um
 * evento dedicado.
 */

export function onConsentAccepted(callback) {
  if (hasAcceptedConsent()) {
    callback();
    return;
  }

  document.addEventListener(
    "spozzer:consent-accepted",
    callback,
    { once: true }
  );
}
