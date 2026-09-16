const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const PHONE_PATTERN =
  /^\d{10,15}$/;


export function normalizePhone(
  value
) {

  return value.replace(
    /\D/g,
    ""
  );

}


export function validateLead(
  data
) {

  const errors = {};


  if (
    data.name.trim().length < 2
  ) {

    errors.name =
      "Informe seu nome.";

  }


  if (
    !EMAIL_PATTERN.test(
      data.email.trim()
    )
  ) {

    errors.email =
      "Informe um e-mail válido.";

  }

  const phone =
    normalizePhone(
      data.phone
    );


  if (
    !PHONE_PATTERN.test(phone)
  ) {

    errors.phone =
      "Informe um WhatsApp válido com DDD.";

  }


  if (
    data.message.trim().length < 10
  ) {

    errors.message =
      "Conte um pouco mais sobre o projeto.";

  }


  return {
    valid:
      Object.keys(errors)
        .length === 0,

    errors,

    normalized: {
      ...data,

      name:
        data.name.trim(),

      email:
        data.email
          .trim()
          .toLowerCase(),

      phone,

      message:
        data.message.trim(),
    },
  };

}