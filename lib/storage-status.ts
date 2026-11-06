/** Report only stable categories; raw driver errors can contain connection details. */
export function storageErrorCode(error: unknown) {
  const object =
    error && typeof error === "object"
      ? (error as { code?: unknown; message?: unknown })
      : {};
  if (object.code === "42P01" || object.code === "3F000")
    return "SCHEMA_NOT_READY";
  if (object.code === "28P01" || object.code === "28000")
    return "DATABASE_AUTHENTICATION_FAILED";
  if (object.code === "42501") return "DATABASE_PERMISSION_DENIED";
  if (
    object.code === "ERR_INVALID_URL" ||
    object.message === "INVALID_DATABASE_URL"
  )
    return "DATABASE_URL_INVALID";
  return "DATABASE_UNAVAILABLE";
}
