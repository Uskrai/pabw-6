import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import axios from "axios";
import React from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import useSWR, { mutate } from "swr";
import AppBar from "./AppBar";
import { useAuth } from "./hooks/useAuth";
import { useUser } from "./hooks/useUser";
import { Product } from "./models/Product";
import { handleError } from "./utils/error-handler";

interface BuyForm {
  quantity: string;
}

export default function ShowProduct() {
  const { product_id } = useParams();

  const { data, isLoading, mutate } = useSWR<{ data: Product }>(
    `/api/v1/product/${product_id}`,
    (url) => axios.get(url)
  );
  const navigate = useNavigate();

  const form = useForm<BuyForm>({
    defaultValues: {
      quantity: "1",
    },
  });

  const { token } = useAuth();
  const { user, mutate: mutateUser } = useUser();

  if (isLoading) {
    return <CircularProgress />;
  }

  const product = data?.data!;

  async function onBuy(e: BuyForm) {
    const result = await axios.post(
      "/api/v1/order",
      {
        products: [
          {
            product_id: product_id,
            quantity: e.quantity,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    navigate(`/user/order/${result.data.id}`);

    mutate();
    mutateUser();
  }

  async function onAddToCart(e: BuyForm) {
    await axios.post(
      "/api/v1/cart",
      {
        product_id: product_id,
        quantity: e.quantity,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    mutate();
  }

  console.log(form.formState.errors.quantity?.message);
  return (
    <div className="App">
      <AppBar />

      <Card sx={{ m: 2 }}>
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Nama: {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deskripsi: {product.description}
          </Typography>
          <Typography variant="body2" fontSize={12}>
            Harga: Rp. {product.price}
          </Typography>
          <Typography variant="body2">Stok: {product.stock}</Typography>
        </CardContent>
        {token && product.user_id != user?.id && (
          <CardActions>
            <TextField
              {...form.register("quantity", {
                required: "Kuantitas harus diisi",
                max: {
                  value: product.stock,
                  message: "Kuantitas tidak boleh lebih dari stok",
                },
              })}
              label="Kuantitas"
              type="number"
              variant="outlined"
              size="small"
              error={form.formState.errors.quantity != null}
              helperText={form.formState.errors.quantity?.message}
            />
          </CardActions>
        )}

        {token && product.user_id != user?.id && (
          <CardActions>
            <Button
              onClick={form.handleSubmit(handleError(onAddToCart))}
              disabled={form.formState.isSubmitting}
            >
              Add To Cart
            </Button>
            <Button
              onClick={form.handleSubmit(handleError(onBuy))}
              disabled={form.formState.isSubmitting}
            >
              Buy
            </Button>
          </CardActions>
        )}
      </Card>
    </div>
  );
}
