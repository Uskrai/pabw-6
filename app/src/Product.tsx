import { TextField } from "@mui/material";
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
import { Product } from "./models/Product";

interface BuyForm {
  quantity: string;
}

export default function ShowProduct() {
  let { product_id } = useParams();

  let { data, isLoading } = useSWR<{ data: Product }>(
    `/api/v1/product/${product_id}`,
    (url) => axios.get(url)
  );
  const navigate = useNavigate();

  const form = useForm<BuyForm>({
    defaultValues: {
      quantity: "0",
    },
  });

  const { token } = useAuth();

  if (isLoading) {
    return <CircularProgress />;
  }

  let product = data?.data!;

  function onBuy(e: BuyForm) {
    axios.post(
      "/api/v1/order",
      {
        products: [
          {
            id: product_id,
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
  }

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

          {token && (
            <>
              <Typography variant="body2" fontSize={18}>
                Kuantitas:
              </Typography>

              <TextField
                {...form.register("quantity")}
                type="number"
                variant="outlined"
                size="small"
              />
            </>
          )}
        </CardContent>

        {token && (
          <CardActions>
            <Link to="" onClick={form.handleSubmit(onBuy)}>
              Buy
            </Link>
          </CardActions>
        )}
      </Card>
    </div>
  );
}
