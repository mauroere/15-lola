async function post(path: string, input: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "isolated-fixture",
    },
    body: JSON.stringify(input),
  });
  return response.json();
}
export async function submitRSVP(input: unknown) {
  return post("/__rsvp", input);
}
export async function suggestSong(input: unknown) {
  return post("/__song", input);
}
export async function reviewRSVP(
  id: string,
  status: string,
  expectedStatus: string,
) {
  return post("/__review", { id, status, expectedStatus });
}
export async function logoutAdmin() {
  return {
    success: false,
    error: "No real sessions in this isolated fixture.",
  };
}
export async function loginAdmin() {
  return {
    success: false,
    error: "No real sessions in this isolated fixture.",
  };
}
