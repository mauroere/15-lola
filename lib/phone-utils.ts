/** Argentine mobile numbers: only strip the domestic 15 when there are 12 national digits. */
export function cleanPhoneNumber(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("549") && digits.length === 13) return digits;
  if (digits.startsWith("54") && digits.length === 12)
    return "549" + digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 12) {
    const prefix = [2, 3, 4].find(
      (size) => digits.slice(size, size + 2) === "15",
    );
    if (prefix) digits = digits.slice(0, prefix) + digits.slice(prefix + 2);
  }
  return digits.length === 10 ? "549" + digits : digits;
}
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  error?: string;
} {
  if (!phone.trim()) return { isValid: true };
  if (
    phone.length > 40 ||
    !/^\+?[\d\s()-]+$/.test(phone.trim()) ||
    !/^[1-9]\d{7,14}$/.test(cleanPhoneNumber(phone))
  ) {
    return {
      isValid: false,
      error:
        "Ingresá un teléfono válido con código de área y, si es del exterior, código de país.",
    };
  }
  return { isValid: true };
}
