const sanitizeLeadPhone = (value) => {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  const compact = raw.replace(/\s+/g, " ");

  // Ratings such as "4.8 4.8 4.8" are not phone numbers.
  if (/^(\d\.\d)(\s+\1)+$/.test(compact) || /\d\.\d/.test(compact)) {
    return "";
  }

  if (/[a-z]/i.test(compact)) {
    return "";
  }

  const digitsOnly = compact.replace(/\D/g, "");

  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return "";
  }

  if (/^(\d)\1+$/.test(digitsOnly)) {
    return "";
  }

  if (/^(\d{2,3})\1{2,}$/.test(digitsOnly)) {
    return "";
  }

  if (new Set(digitsOnly.split("")).size < 4) {
    return "";
  }

  return compact;
};

module.exports = {
  sanitizeLeadPhone,
};
