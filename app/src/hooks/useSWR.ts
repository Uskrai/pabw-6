import axios from "axios";
import React from "react";
import useSWR from "swr";
import { PublicConfiguration } from "swr/_internal";
import { useAuth } from "./useAuth";

export function useAuthSWR<T>(url: string, options?: Partial<PublicConfiguration> | undefined) {
  const { isLoading: isAuthLoading, token, mutate: authMutate } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);

  const {
    data: swrData,
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

  const [data, setData] = React.useState(swrData?.data);

  React.useEffect(() => {
    if (token && swrData) {
      setData(swrData?.data);
    } else if (!token && error?.response?.status == 401) {
      setData(null);
    } 
    if (token && error?.response?.status == 401) {
      authMutate();
    }

    setIsLoading(isAuthLoading || isSwrLoading);
  }, [token, swrData, error, isAuthLoading, isSwrLoading]);

  return {
    isLoading,
    // isLoading: isAuthLoading || isSwrLoading,
    isValidating,
    data: data as T | null,
    error,
    mutate,
  };
}
