import { normalizeApiBaseUrl } from "@/lib/auth-storage";

export const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export async function readApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export function buildApiUrl(apiBaseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeApiBaseUrl(
    apiBaseUrl || DEFAULT_API_BASE_URL,
  );
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}
