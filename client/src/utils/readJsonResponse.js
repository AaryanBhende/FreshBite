export async function readJsonResponse(response) {
  const body = await response.text();
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    return {
      error: response.ok
        ? 'The server returned an invalid response.'
        : `Request failed with status ${response.status}.`,
    };
  }
}
