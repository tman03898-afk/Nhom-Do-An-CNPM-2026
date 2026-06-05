function normalizePhone(phone) {
  return String(phone || '').trim();
}

function isValidPhoneNumber(phone) {
  const normalized = normalizePhone(phone);
  return /^0\d{8,14}$/.test(normalized);
}

module.exports = {
  normalizePhone,
  isValidPhoneNumber,
};
