import axios from "axios";
import React from "react";
import useSWR, { KeyedMutator } from "swr";
import { AuthContext } from "../context/User";

export interface Auth {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;

  isLoading: boolean;
  isLogin: boolean;

  mutate: KeyedMutator<any>;
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

  const { data, error, isLoading: isSwrLoading, mutate } = useSWR(
    "/api/v1/auth/refresh",
    async (url) => {
      console.log("calling", url);
      return await axios.post(url).then((it) => it.data);
    },
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  function login(access_token: string) {
    localStorage.setItem("isLogin", JSON.stringify(true));
    setToken(access_token);
    setIsLogin(true);
  }

  function logout() {
    localStorage.removeItem("isLogin");
    setToken(null);
    setIsLogin(false);
  }

  React.useEffect(() => {
    if (data) {
      login(data.access_token);
    }

    if (error) {
      logout();
    }

    setIsLoading(isSwrLoading);
  }, [data, error, isSwrLoading]);

  return { token, isLogin, isLoading, login, logout, mutate };
}
