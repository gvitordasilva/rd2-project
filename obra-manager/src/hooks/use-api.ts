"use client";
import { useAuth } from "./use-auth";

interface FetchOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export function useApi() {
  const { accessToken } = useAuth();

  const apiFetch = async <T = unknown>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> => {
    const { params, body, ...fetchOptions } = options;
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    let serializedBody: BodyInit | null | undefined;
    if (body instanceof FormData) {
      serializedBody = body;
    } else if (body !== undefined && body !== null) {
      serializedBody = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    } else if (fetchOptions.method && fetchOptions.method !== "GET" && fetchOptions.method !== "DELETE") {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, { ...fetchOptions, body: serializedBody, headers });

    if (response.status === 401) {
      const refreshResponse = await fetch("/api/auth/refresh", { method: "POST" });
      if (!refreshResponse.ok) {
        useAuth.getState().logout();
        throw new Error("Sessão expirada");
      }
      const refreshData = await refreshResponse.json();
      const { user } = useAuth.getState();
      if (user) useAuth.getState().setAuth(user, refreshData.data.accessToken);

      headers["Authorization"] = `Bearer ${refreshData.data.accessToken}`;
      const retryResponse = await fetch(url, { ...fetchOptions, body: serializedBody, headers });
      if (!retryResponse.ok) throw new Error("Erro na requisição");
      return retryResponse.json();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro desconhecido" }));
      throw new Error(errorData.message || "Erro na requisição");
    }

    return response.json();
  };

  return { apiFetch };
}
