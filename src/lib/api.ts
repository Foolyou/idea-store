const BASE = "";

export interface ApiOk<T> {
  ok: true;
  data: T;
}
export interface ApiError {
  ok: false;
  error: string;
}
export type ApiRes<T = void> = ApiOk<T> | ApiError;

export async function api<T>(path: string, options?: RequestInit): Promise<ApiRes<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
    ...options,
  });
  return res.json() as Promise<ApiRes<T>>;
}

export async function apiRaw<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
    ...options,
  });
  return res.json() as Promise<T>;
}
