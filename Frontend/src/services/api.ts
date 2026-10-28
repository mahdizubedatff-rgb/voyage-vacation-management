import axios, { AxiosError } from "axios";
import type { ApiSuccess } from "../types";

const TOKEN_KEY = "voyage.token";

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode) - session lasts until reload */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 120_000,
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type UnauthorizedListener = () => void;
let onUnauthorized: UnauthorizedListener | null = null;
export const setUnauthorizedListener = (listener: UnauthorizedListener | null) => {
  onUnauthorized = listener;
};

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isAuthCall = error.config?.url?.startsWith("/auth/login") || error.config?.url?.startsWith("/auth/register");
    if (error.response?.status === 401 && !isAuthCall && tokenStorage.get()) {
      tokenStorage.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export const unwrap = <T>(response: { data: ApiSuccess<T> }): T => response.data.data;

/** Extracts the user-facing message from an API error. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (message) return message;
    if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (!error.response) return "We couldn't reach the server. Check your connection and try again.";
  }
  return fallback;
}

/** Field-level validation errors returned by the API, if any. */
export function getFieldErrors(error: unknown): Record<string, string[]> | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  return (error.response?.data as { error?: { details?: Record<string, string[]> } } | undefined)?.error?.details;
}
