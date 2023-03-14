import axios from "axios";
import React from "react";
import useSWR from "swr";
import { PublicConfiguration } from "swr/_internal";
import { useAuth } from "./useAuth";

export function useAuthSWR(url: string, options: Partial<PublicConfiguration> | undefined) {
  const { isLoading, token, mutate: authMutate } = useAuth();

  const {
    data,
    isLoading: isSwrLoading,
    error,
    mutate,
  } = useSWR(token ? [url, token] : null, ([url, token]) =>{
    console.log("calling", url);
    return axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })},
    options as any
  );

  const [user, setUser] = React.useState(data?.data);

  React.useEffect(() => {
    if (data) {
      setUser(data?.data);
    }
    if (error?.response.status == 401) {
      authMutate();
    }
  }, [token, data, error]);

  return {
    isLoading: isLoading || isSwrLoading,
    data: user,
    error,
    mutate,
  };
}
