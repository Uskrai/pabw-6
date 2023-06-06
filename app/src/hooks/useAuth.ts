import axios, { AxiosError } from "axios";
import React from "react";
import useSWR, { KeyedMutator } from "swr";
import { AuthContext } from "../context/User";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface Auth {
  token: string | null;
  error: AxiosError | null;
  login: (token: string) => void;
  logout: () => void;

  isLoading: boolean;
  isLogin: boolean;

  mutate: () => Promise<void>;
}

export function useAuth(): Auth {
  return React.useContext(AuthContext)!;
}

export function useProvidedAuth(): Auth {
  const [token, setToken] = React.useState<string | null>(null);
  const [isLogin, setIsLogin] = React.useState(
    JSON.parse(localStorage.getItem("isLogin") || "false")
  );
  const [isLoading, setIsLoading] = React.useState(true);

  const queryClient = useQueryClient();
  const mutate = React.useMemo(
    () => () => queryClient.invalidateQueries(["user", "refresh"]),
    [queryClient]
  );
  const {
    data,
    error,
    isLoading: isSwrLoading,
  } = useQuery<any, AxiosError>({
    queryKey: ["user", "refresh"],
    queryFn: async () => {
      const url = "/api/v1/auth/refresh";
      console.log("calling", url);
      return await axios.post(url).then((it) => it.data);
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
    retry: 1,
    enabled: isLogin,
  });

  const login = React.useCallback(
    (access_token: string) => {
      localStorage.setItem("isLogin", JSON.stringify(true));
      setToken(access_token);
      setIsLogin(true);
    },
    [isLogin]
  );

  const logout = React.useCallback(() => {
    localStorage.removeItem("isLogin");
    setToken(null);
    setIsLogin(false);
  }, [isLogin]);

  React.useEffect(() => {
    if (data) {
      login(data.access_token);
    }

    if (error) {
      console.log(error);
      logout();
    }

    console.log({ isSwrLoading, isLogin, error });
    setIsLoading(isSwrLoading && isLogin);
  }, [data, error, isSwrLoading]);

  return { token, isLogin, isLoading, login, logout, mutate, error };
}
