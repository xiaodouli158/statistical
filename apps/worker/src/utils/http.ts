export function json<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, { status });
}
