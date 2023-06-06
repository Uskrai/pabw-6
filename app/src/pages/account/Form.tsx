import { handleError } from "@/utils/error-handler";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { UseFormReturn } from "react-hook-form";
import { UserForm } from "../../models/User";

interface Props {
  onClick: (e: UserForm) => Promise<any>;
  form: UseFormReturn<UserForm>;
  withPassword?: boolean;
}

export default function Form({
  form: { register, formState, handleSubmit },
  onClick,
  withPassword,
}: Props) {
  return (
    <FormControl>
      <TextField
        {...register("name", { required: "Nama harus di isi" })}
        label={"Nama"}
        defaultValue={formState.defaultValues?.email}
        sx={{ m: 2 }}
        error={formState.errors.name != null}
        helperText={formState.errors.name?.message}
      />
      <TextField
        {...register("email", { required: "Email harus di isi" })}
        label={"Email"}
        defaultValue={formState.defaultValues?.email}
        sx={{ m: 2 }}
        error={formState.errors.email != null}
        helperText={formState.errors.email?.message}
      />
      <Select
        {...register("role")}
        label="Role"
        sx={{ m: 2 }}
        defaultValue={formState.defaultValues?.role}

        // error={formState.errors.email != null}
        // helperText={formState.errors.email?.message}
      >
        <MenuItem value="Customer">Customer</MenuItem>
        <MenuItem value="Courier">Courier</MenuItem>
      </Select>

      {withPassword && (
        <>
          <TextField
            {...register("password", {
              minLength: {
                value: 8,
                message: "Password harus lebih atau sama dengan 8",
              },
            })}
            type="password"
            label={"Password"}
            defaultValue={formState.defaultValues?.password}
            sx={{ m: 2 }}
            error={formState.errors.password != null}
            helperText={formState.errors.password?.message}
          />

          <TextField
            {...register("confirm_password", {
              validate: {
                equalToPassword: (it: string, formValues) =>
                  it == formValues.password || "Harus sama dengan password",
              },
            })}
            type="password"
            label={"Confirm Password"}
            defaultValue={formState.defaultValues?.confirm_password}
            sx={{ m: 2 }}
            error={formState.errors.confirm_password != null}
            helperText={formState.errors.confirm_password?.message}
          />
        </>
      )}

      <TextField
        {...register("balance", {
          required: "Balance harus di isi",
        })}
        type="number"
        label={"Balance"}
        defaultValue={formState.defaultValues?.balance}
        sx={{ m: 2 }}
        error={formState.errors.balance != null}
        helperText={formState.errors.balance?.message}
      />

      {/* <TextField */}
      {/*   {...balanceForm.register("balance", { */}
      {/*     // minLength: { */}
      {/*     //   value: 8, */}
      {/*     //   message: "Password harus lebih atau sama dengan 8", */}
      {/*     // }, */}
      {/*   })} */}
      {/*   type="number" */}
      {/*   label={"Tambah"} */}
      {/*   defaultValue={balanceForm.formState.defaultValues?.balance} */}
      {/*   sx={{ m: 2 }} */}
      {/*   fullWidth */}
      {/*   error={balanceForm.formState.errors.balance != null} */}
      {/*   helperText={balanceForm.formState.errors.balance?.message} */}
      {/* /> */}

      <Button
        disabled={formState.isSubmitting}
        onClick={handleSubmit(handleError(onClick))}
      >
        Submit
      </Button>
    </FormControl>
  );
}
