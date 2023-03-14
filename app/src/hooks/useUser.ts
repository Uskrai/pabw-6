import React from "react";
import { KeyedMutator } from "swr";
import { useAuth } from "./useAuth";
import { useAuthSWR } from "./useSWR";

interface User {
  id: string;

  email: string;
  role: "Admin" | "Customer" | "Courier";

  created_at: string;
  updated_at: string;
}

interface UseUser {
  user: User | null;
  mutate: KeyedMutator<any>;
  isLoading: boolean;
}

export function useUser(): UseUser {
  const { token, isLogin } = useAuth();

  const { data, error, isLoading, mutate } = useAuthSWR(
    "/api/v1/auth/profile",
    {
      shouldRetryOnError: isLogin,
    }
  );

  const [user, setUser] = React.useState(data);

  React.useEffect(() => {
    if (data) {
      console.log("useUser useEffect", data);
      setUser(data);
    } else if (!isLoading) {
      setUser(null);
    }
  }, [token, data, error, isLoading]);

  return { user, mutate, isLoading };
}
