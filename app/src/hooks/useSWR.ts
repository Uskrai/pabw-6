import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError, AxiosResponse } from "axios";
import React from "react";
import useSWR from "swr";
import { mutate } from "swr";
import { PublicConfiguration } from "swr/_internal";
import { useAuth } from "./useAuth";

export function useMutateAuth() {
  return (url: string) => {
    mutate(url);
  };
}

// //check if value is primitive
// function isPrimitive(obj: any) {
//   return obj !== Object(obj);
// }
//
// function deepEqual(obj1: any, obj2: any) {
//   if (obj1 === obj2)
//     // it's just the same object. No need to compare.
//     return true;
//
//   if (obj1 == null && obj2 == null) {
//     return true;
//   }
//
//   if (obj1 == null || obj2 == null) return false;
//
//   if (isPrimitive(obj1) && isPrimitive(obj2))
//     // compare primitives
//     return obj1 === obj2;
//
//   if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;
//
//   // compare objects with same number of keys
//   for (const key in obj1) {
//     if (!(key in obj2)) return false; //other object doesn't have this prop
//     if (!deepEqual(obj1[key], obj2[key])) return false;
//   }
//
//   return true;
// }

export function useAuthSWR<T>(
  url: string | null,
  options?: Partial<PublicConfiguration> | undefined
) {
  const {
    isLoading: isAuthLoading,
    token,
    mutate: authMutate,
    error: authError,
  } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const queryClient = useQueryClient();

  const {
    data: swrData,
    isLoading: isQueryLoading,
    isInitialLoading,
    error,
  } = useQuery<AxiosResponse, AxiosError>({
    queryKey: [url, token],
    queryFn: async () => {
      const u = url!;
      console.log("calling", url);
      return await axios.get(u, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    enabled: token != null && url != null && authError == null,
    keepPreviousData: true,
  });

  const mutate = React.useCallback(
    () => queryClient.invalidateQueries({ queryKey: [url] }),
    [queryClient, url]
  );

  const [data, setData] = React.useState(swrData?.data);

  React.useEffect(() => {
    if (token && swrData) {
      setData(swrData?.data);
    } else if (!token || error?.response?.status == 401) {
      setData(null);
    }

    if (token && error?.response?.status == 401) {
      authMutate();
    }

    // console.log({ token, isQueryLoading, isInitialLoading });
    setIsLoading((isAuthLoading || isInitialLoading) && authError == null);
  }, [token, swrData, error, isAuthLoading, isQueryLoading, authError]);

  return {
    isLoading,
    // isLoading: isAuthLoading || isSwrLoading,
    data: data as T | null,
    error,
    mutate,
  };
}
