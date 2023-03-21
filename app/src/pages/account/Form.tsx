import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { UseFormReturn } from "react-hook-form";
import { UserForm } from "../../models/User";

interface Props {
  onClick: (e: UserForm) => void;
  form: UseFormReturn<UserForm>;
}

export default function Form({
  form: { register, formState, handleSubmit },
  onClick,
}: Props) {
  console.log(formState.defaultValues);
  return (
    <FormControl>
      <TextField
        {...register("email")}
        label={"Email"}
        defaultValue={formState.defaultValues?.email}
        sx={{ m: 2 }}
        fullWidth
      />
      <Select {...register("role")} sx={{ m: 2 }} defaultValue={formState.defaultValues?.role}>
        <MenuItem value="Customer">Customer</MenuItem>
        <MenuItem value="Courier">Courier</MenuItem>
      </Select>

      <Button onClick={handleSubmit(onClick)}>Submit</Button>
    </FormControl>
  );
}
