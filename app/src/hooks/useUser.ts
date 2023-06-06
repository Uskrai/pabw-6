import React from "react";
import { KeyedMutator } from "swr";
import { User } from "../models/User";
import { useAuth } from "./useAuth";
import { useAuthSWR } from "./useSWR";

interface UseUser {
  user: User | null;
  mutate: KeyedMutator<any>;
  isLoading: boolean;
}

export function useUser(): UseUser {
  const { token, isLogin } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);

  const {
    data,
    error,
    mutate,
    isLoading: isSwrLoading,
  } = useAuthSWR<User>("/api/v1/auth/profile", {
    shouldRetryOnError: isLogin,
  });

  const [user, setUser] = React.useState(data);

  React.useEffect(() => {
    if (data) {
      setUser(data);
    } else if (!isLoading) {
      setUser(null);
    }

    setIsLoading(isSwrLoading);
  }, [token, data, error, isSwrLoading]);

  return { user, mutate, isLoading };
}
