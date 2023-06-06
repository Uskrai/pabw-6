import { handleError } from "@/utils/error-handler";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import { Controller, UseFormReturn } from "react-hook-form";
import { ProductForm } from "../../models/Product";

interface Props {
  onClick: (e: ProductForm) => Promise<any>;
  form: UseFormReturn<ProductForm>;
}

export default function Form({
  form: { register, formState, handleSubmit },
  onClick,
}: Props) {
  return (
    <FormControl>
      <TextField
        {...register("name", { required: "Nama harus di isi" })}
        label={"Name"}
        defaultValue={formState.defaultValues?.name}
        sx={{ m: 2 }}

        error={formState.errors.name != null}
        helperText={formState.errors.name?.message}

      />
      <TextField
        {...register("description")}
        label={"Deskripsi"}
        defaultValue={formState.defaultValues?.description}
        sx={{ m: 2 }}
        multiline
      />
      <TextField
        {...register("price", {
          min: { value: 1, message: "Harga harus lebih atau sama dengan 1" },
          required: "Harga harus di isi",
        })}
        type="number"
        label={"Harga"}
        defaultValue={formState.defaultValues?.price}
        sx={{ m: 2 }}
        error={formState.errors.price != null}
        helperText={formState.errors.price?.message}
      />
      <TextField
        {...register("stock", {
          min: { value: 0, message: "Stok Harus lebih atau sama dengan 0" },
          required: "Stok harus diisi",
        })}
        type="number"
        label="Stok"
        defaultValue={formState.defaultValues?.stock}
        sx={{ m: 2 }}
        error={formState.errors.stock != null}
        helperText={formState.errors.stock?.message}
      />

      <Button onClick={handleSubmit(handleError(onClick))} disabled={formState.isSubmitting}>
        Submit
      </Button>
    </FormControl>
  );
}
