import axios from "axios";
import React from "react";
import useSWR from "swr";
import { PublicConfiguration } from "swr/_internal";
import { useAuth } from "./useAuth";

export function useAuthSWR<T>(url: string, options?: Partial<PublicConfiguration> | undefined) {
  const { isLoading: isAuthLoading, token, mutate: authMutate } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);

  const {
    data,
    isLoading: isSwrLoading,
    error,
    mutate,
    isValidating,
  } = useSWR(token ? [url, token] : null, ([url, token]) =>{
    return axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })},
    options as any
  );

  const [user, setUser] = React.useState(data?.data);

  React.useEffect(() => {
    if (token && data) {
      setUser(data?.data);
    } else if (!token || error?.response.status == 401) {
      setUser(null);
      // authMutate();
    }

    setIsLoading(isAuthLoading || isSwrLoading);
  }, [token, data, error]);

  return {
    isLoading,
    // isLoading: isAuthLoading || isSwrLoading,
    isValidating,
    data: user as T | null,
    error,
    mutate,
  };
}
