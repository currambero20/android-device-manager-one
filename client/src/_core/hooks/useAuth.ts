import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

const SESSION_STORAGE_KEY = "adm_session_token";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

function getSessionFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "string") {
        return parsed;
      }
    } catch {
      return stored;
    }
  }
  return null;
}

function setSessionToStorage(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_STORAGE_KEY, token);
}

function clearSessionFromStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [localSession, setLocalSession] = useState<string | null>(getSessionFromStorage());

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: true,
  });

  useEffect(() => {
    if (meQuery.isFetched) {
      setSessionChecked(true);
    }
  }, [meQuery.isFetched]);

  useEffect(() => {
    const storedSession = getSessionFromStorage();
    setLocalSession(storedSession);
  }, []);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      clearSessionFromStorage();
      localStorage.removeItem("manus-runtime-user-info");
      window.location.href = redirectPath;
    }

  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    let user = meQuery.data ?? null;
    
    if (meQuery.error instanceof TRPCClientError && meQuery.error.data?.code === "UNAUTHORIZED") {
      user = null;
    }

    if (user) {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(user)
      );
    } else if (meQuery.isFetched) {
      localStorage.removeItem("manus-runtime-user-info");
    }
    
    const isAuth = !!user;
    
    return {
      user,
      loading: !meQuery.isFetched && !sessionChecked,
      error: meQuery.error,
      isAuthenticated: isAuth,
    };
  }, [
    meQuery.data,
    meQuery.isLoading,
    meQuery.isFetched,
    meQuery.error,
    sessionChecked,
  ]);


  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}

export { setSessionToStorage, clearSessionFromStorage };
