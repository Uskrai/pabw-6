import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { useAuthSWR } from "../../hooks/useSWR";
import { User, UserForm } from "../../models/User";
import Form from "./Form";

interface Props {
  // role: "Customer" | "Courier";
}

export default function EditProduct(props: Props) {
  let { id } = useParams();

  let {
    data,
    isLoading,
    mutate: mutateNow,
  } = useAuthSWR<User>(`/api/v1/account/${id}`);

  let account = data!;

  const navigate = useNavigate();
  const form = useForm<UserForm>({
    defaultValues: {
      email: account?.email,
      role: account?.role ?? "",
    },
  });

  React.useEffect(() => {
    form.reset(account!);
  }, [isLoading]);

  const { token } = useAuth();

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Form
      form={form}
      onClick={async (e) => {
        try {
          let res = await axios.put(`/api/v1/account/${account?.id}`, e, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          mutate("/api/v1/account");
          mutateNow();
          navigate(`/admin/account/${e.role.toLowerCase()}/${account.id}`);
        } catch (e) {}
      }}
    />
  );
}
