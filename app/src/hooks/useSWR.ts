import axios from "axios";
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
  const { isLoading: isAuthLoading, token, mutate: authMutate } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);

  const {
    data: swrData,
    isLoading: isSwrLoading,
    error,
    mutate,
    isValidating,
  } = useSWR(
    token && url ? [url] : null,
    ([url]) => {
      console.log("calling", url);
      return axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    {
      keepPreviousData: true,
      ...(options as any),
    }
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

    // console.log({isAuthLoading, isSwrLoading, data})
    // if (data == null) {
    setIsLoading(isAuthLoading || isSwrLoading);
    // }
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
