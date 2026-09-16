const STORAGE_KEY =
  "spozzer_attribution";

const UTM_FIELDS = {
  UTM_SOURCE:
    "utm_source",

  UTM_CAMPAIGN:
    "utm_campaign",

  UTM_MEDIUM:
    "utm_medium",

  UTM_CONTENT:
    "utm_content",

  UTM_TERM:
    "utm_term",
};


function emptyAttribution() {
  return {
    UTM_SOURCE: "",
    UTM_CAMPAIGN: "",
    UTM_MEDIUM: "",
    UTM_CONTENT: "",
    UTM_TERM: "",
  };
}


function readFromUrl() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const attribution =
    emptyAttribution();

  for (
    const [
      outputKey,
      queryKey,
    ] of Object.entries(
      UTM_FIELDS
    )
  ) {
    attribution[outputKey] =
      (
        params.get(queryKey) ??
        params.get(
          queryKey.toUpperCase()
        ) ??
        ""
      ).trim();
  }

  return attribution;
}


function hasAttribution(
  attribution
) {
  return Object.values(
    attribution
  ).some(Boolean);
}


export function getAttribution() {
  const current =
    readFromUrl();

  /*
   * Se existem UTMs na URL,
   * guardamos durante a sessão.
   */
  if (
    hasAttribution(current)
  ) {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(current)
      );
    } catch {
      // Storage indisponível.
    }

    return current;
  }


  /*
   * Se a URL não tem mais UTMs,
   * recuperamos as capturadas
   * quando a pessoa chegou.
   */
  try {
    const stored =
      sessionStorage.getItem(
        STORAGE_KEY
      );

    if (stored) {
      return {
        ...emptyAttribution(),
        ...JSON.parse(stored),
      };
    }
  } catch {
    // Mantemos valores vazios.
  }


  return emptyAttribution();
}