/** Keep spelling for display; collapse accidental spacing for identity comparisons. */
export const cleanName = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/gu, " ");
export const nameKey = (value: string) =>
  cleanName(value).toLocaleLowerCase("es-AR");

export const searchKey = (value: string) =>
  nameKey(value).normalize("NFD").replace(/\p{M}/gu, "");
