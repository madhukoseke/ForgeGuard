import { OPERATOR_TOKEN_KEY } from "./utils";

export async function fetchWithOperatorToken(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const existingToken = window.localStorage.getItem(OPERATOR_TOKEN_KEY);
  if (existingToken) headers.set("x-forgeguard-token", existingToken);

  let res = await fetch(input, { ...init, headers });
  if (res.status !== 401) return res;

  const token = window.prompt("ForgeGuard operator token");
  if (!token) return res;

  window.localStorage.setItem(OPERATOR_TOKEN_KEY, token);
  headers.set("x-forgeguard-token", token);
  res = await fetch(input, { ...init, headers });
  return res;
}
