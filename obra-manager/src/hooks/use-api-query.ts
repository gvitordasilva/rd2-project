"use client";
import useSWR, { SWRConfiguration } from "swr";
import { useAuth } from "./use-auth";

/**
 * Hook de leitura com cache SWR.
 * Reutiliza dados em cache por até 30s, refetcha ao focar a janela,
 * e deduplicam requisições idênticas feitas em sequência.
 *
 * Uso: const { data, loading, error, mutate } = useApiQuery<Tipo>("/api/obras")
 */
export function useApiQuery<T = unknown>(
  endpoint: string | null,
  params?: Record<string, string | number | boolean | undefined>,
  swrConfig?: SWRConfiguration
) {
  const { accessToken } = useAuth();

  const url = (() => {
    if (!endpoint) return null;
    if (!params) return endpoint;
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
    });
    const qs = sp.toString();
    return qs ? `${endpoint}?${qs}` : endpoint;
  })();

  const fetcher = async (u: string): Promise<T> => {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    const res = await fetch(u, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Erro" }));
      throw new Error(err.message || "Erro na requisição");
    }
    return res.json();
  };

  const { data, error, isLoading, mutate } = useSWR<T>(url, fetcher, {
    dedupingInterval: 5000,      // dedup de 5s para a mesma URL
    revalidateOnFocus: true,     // revalida ao focar janela
    revalidateOnReconnect: true, // revalida ao reconectar
    ...swrConfig,
  });

  return {
    data,
    loading: isLoading,
    error: error as Error | undefined,
    mutate,
  };
}
