import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import axios from "axios";
import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import useSWR, { mutate } from "swr";
import { dateToString } from "../../helper";
import { useAuth } from "../../hooks/useAuth";
import { useAuthSWR } from "../../hooks/useSWR";
import { Product } from "../../models/Product";
import { statusToString, Transaction } from "../../models/Transaction";
import { User } from "../../models/User";

export default function ShowProduct() {
  const { id } = useParams();

  const {
    data: order,
    isLoading,
    mutate: mutateNow,
  } = useAuthSWR<Transaction>(`/api/v1/transaction/${id}`);
  const { data: merchant } = useAuthSWR<User>(
    order ? `/api/v1/account/${order.user_id}` : null
  );

  const confirmForm = useForm();

  const { token } = useAuth();

  const reversedStatus = useMemo(
    () => order?.status?.map((it) => it).reverse(),
    [order?.status]
  );

  if (isLoading && order == null) {
    return <CircularProgress />;
  }

  const onConfirm = async (): Promise<void> => {
    try {
      await axios.post(
        `/api/v1/transaction/${id}/confirm`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      mutateNow();
      mutate(["/api/v1/transaction", token]);
    } catch {}
  };

  return (
    <Card sx={{ m: 2 }}>
      {order ? (
        <>
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              Nama: {order.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Customer: {merchant?.email}
            </Typography>
            <Typography variant="body2" fontSize={12}>
              Harga: Rp. {order.price}
            </Typography>
            <Typography variant="body2" fontSize={12}>
              Status: {statusToString(order.status.at(-1))}
            </Typography>

            <Typography variant="h5">Barang:</Typography>
            <Stack>
              {order.products.map((it) => {
                return (
                  <Box key={it.id}>
                    <ProductCard product={it} />
                  </Box>
                );
              })}
            </Stack>

            <Typography variant="h5">Status:</Typography>
            <Stack>
              {reversedStatus?.map((it) => {
                return (
                  <Box key={it.date}>
                    {statusToString(it)} {dateToString(it.date)}
                  </Box>
                );
              })}
            </Stack>
          </CardContent>

          {order?.status.at(-1)?.type?.type == "Processing" && (
            <CardActions>
              <Button
                size="small"
                color="primary"
                onClick={confirmForm.handleSubmit(onConfirm)}
                disabled={confirmForm.formState.isSubmitting}
              >
                Confirm
              </Button>
            </CardActions>
          )}
        </>
      ) : null}
    </Card>
  );
}

function ProductCard({
  product: orderProduct,
}: {
  product: { id: string; quantity: string };
}) {
  const { data: product, isLoading } = useSWR<{ data: Product }>(
    `/api/v1/product/${orderProduct.id}`,
    (url) => axios.get(url)
  );

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <div>
      {orderProduct.quantity} x {product?.data?.name}
    </div>
  );
}
