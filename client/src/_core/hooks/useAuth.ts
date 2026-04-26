import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

const SESSION_KEY = "adm_session";
const USER_KEY = "adm_user_data";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
    onError: () => {
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
    } finally {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SESSION_KEY);
      window.location.href = redirectPath;
    }
  }, [logoutMutation, redirectPath]);

  const state = useMemo(() => {
    let user = meQuery.data ?? null;
    
    if (meQuery.error instanceof TRPCClientError && meQuery.error.data?.code === "UNAUTHORIZED") {
      user = null;
    }

    if (user) {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn("[Auth] localStorage full:", e);
      }
      localStorage.setItem(SESSION_KEY, "active");
    } else if (meQuery.isFetched) {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
    
    return {
      user,
      loading: meQuery.isLoading,
      error: meQuery.error,
      isAuthenticated: !!user,
    };
  }, [meQuery.data, meQuery.isLoading, meQuery.isFetched, meQuery.error]);

  useEffect(() => {
    if (!mounted || !redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [mounted, redirectOnUnauthenticated, redirectPath, meQuery.isLoading, logoutMutation.isPending, state.user]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
