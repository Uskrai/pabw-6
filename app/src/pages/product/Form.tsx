import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import { UseFormReturn } from "react-hook-form";
import { ProductForm } from "../../models/Product";

interface Props {
  onClick: (e: ProductForm) => void;
  form: UseFormReturn<ProductForm>;
}

export default function Form({
  form: { register, formState, handleSubmit },
  onClick,
}: Props) {
  return (
    <FormControl>
      <TextField
        {...register("name")}
        label={"Name"}
        defaultValue={formState.defaultValues?.name}
        sx={{ m: 2 }}
        fullWidth
      />
      <TextField
        {...register("description")}
        label={"Deskripsi"}
        defaultValue={formState.defaultValues?.description}
        sx={{ m: 2 }}
        multiline
        fullWidth
      />
      <TextField
        {...register("price")}
        label={"Harga"}
        defaultValue={formState.defaultValues?.price}
        sx={{ m: 2 }}
        fullWidth
      />
      <TextField
        {...register("stock")}
        label="Stock"
        defaultValue={formState.defaultValues?.stock}
        sx={{ m: 2 }}
        fullWidth
      />

      <Button onClick={handleSubmit(onClick)}>Submit</Button>
    </FormControl>
  );
}
