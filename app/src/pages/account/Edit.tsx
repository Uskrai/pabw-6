import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import axios from "axios";
import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { useAuthSWR, useMutateAuth } from "../../hooks/useSWR";
import { User, UserForm } from "../../models/User";
import Form from "./Form";
import { handleError } from "@/utils/error-handler";

interface Props {
  // role: "Customer" | "Courier";
}

export default function EditProduct(props: Props) {
  const { id } = useParams();

  const {
    data,
    isLoading,
    mutate: mutateNow,
  } = useAuthSWR<User>(`/api/v1/account/${id}`);

  const account = data;

  const navigate = useNavigate();
  const form = useForm<UserForm>({
    defaultValues: {
      email: account?.email,
      role: account?.role ?? "",
    },
  });

  React.useEffect(() => {
    if (account != null) {
      form.reset(account!);
    }
  }, [isLoading]);

  const { token } = useAuth();

  const mutateAuth = useMutateAuth();

  const balanceForm = useForm<{ balance: number }>({});

  async function onSubmitBalance(e: { balance: number }) {
    const res = await axios.put(
      `/api/v1/account/${account?.id}`,
      {
        balance: parseInt(data?.balance ?? "0") + e.balance,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // mutateAuth("/api/v1/account");
    // mutateNow();
    navigate(`/admin/account/${account?.role?.toLowerCase()}/${account?.id}`);
  }

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Grid direction="column">
      <Form
        form={form}
        withPassword={true}
        onClick={async (e) => {
          const res = await axios.put(
            `/api/v1/account/${account?.id}`,
            {
              ...e,
              password: e.password != "" ? e.password : null,
              confirm_password:
                e.confirm_password != "" ? e.confirm_password : null,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          mutateAuth("/api/v1/account");
          mutateNow();
          navigate(`/admin/account/${e.role.toLowerCase()}/${account?.id}`);
        }}
      />

      <Grid item>
        <FormControl>
          <TextField
            {...balanceForm.register("balance", {
              valueAsNumber: true,
              // minLength: {
              //   value: 8,
              //   message: "Password harus lebih atau sama dengan 8",
              // },
            })}
            type="number"
            label={"Tambah Balance"}
            defaultValue={balanceForm.formState.defaultValues?.balance}
            sx={{ m: 2 }}
            fullWidth
            error={balanceForm.formState.errors.balance != null}
            helperText={balanceForm.formState.errors.balance?.message}
          />
          <Button
            disabled={balanceForm.formState.isSubmitting}
            onClick={balanceForm.handleSubmit(handleError(onSubmitBalance))}
          >
            Submit
          </Button>
        </FormControl>
      </Grid>
    </Grid>
  );
}
