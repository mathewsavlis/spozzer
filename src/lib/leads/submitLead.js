const API_URL =
  import.meta.env
    .PUBLIC_LEADS_API_URL
    ?.trim();


let pendingSubmission = null;


/*
 * =========================================
 * REQUEST ID
 * =========================================
 */

function createRequestId() {
  if (
    typeof globalThis.crypto
      ?.randomUUID === "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  /*
   * Fallback para navegadores que
   * não possuem crypto.randomUUID().
   *
   * O formato continua compatível
   * com a validação do Worker:
   *
   * /^[a-zA-Z0-9-]{20,80}$/
   */
  return [
    "lead",
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
 * =========================================
 * IDEMPOTENCY
 * =========================================
 */

function getRequestId(lead) {
  const fingerprint =
    JSON.stringify(lead);

  /*
   * Se uma tentativa anterior falhou
   * sem confirmação do servidor e os
   * dados continuam iguais, reutilizamos
   * o mesmo requestId.
   */
  if (
    pendingSubmission &&
    pendingSubmission.fingerprint ===
      fingerprint
  ) {
    return pendingSubmission.requestId;
  }

  const requestId =
    createRequestId();

  pendingSubmission = {
    fingerprint,
    requestId,
  };

  return requestId;
}


/*
 * =========================================
 * SUBMIT LEAD
 * =========================================
 */

export async function submitLead(
  lead
) {
  if (!API_URL) {
    throw new Error(
      "LEADS_API_NOT_CONFIGURED"
    );
  }

  const requestId =
    getRequestId(lead);

  const response =
    await fetch(
      API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            ...lead,
            requestId,
          }),
      }
    );


  const result =
    await response
      .json()
      .catch(
        () => ({})
      );


  if (!response.ok) {
    const error =
      new Error(
        result.message ||
        "Não foi possível enviar o formulário."
      );

    error.status =
      response.status;

    error.fields =
      result.fields;

    throw error;
  }


  /*
   * O servidor confirmou o cadastro.
   *
   * Podemos esquecer o requestId,
   * pois uma próxima submissão deverá
   * representar uma nova operação.
   */
  pendingSubmission = null;


  return result;
}