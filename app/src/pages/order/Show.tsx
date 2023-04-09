import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import axios from "axios";
import React from "react";
import { useParams } from "react-router-dom";
import useSWR from "swr";
import { useAuthSWR } from "../../hooks/useSWR";
import { Product } from "../../models/Product";
import { Transaction } from "../../models/Transaction";
import { User } from "../../models/User";

export default function ShowProduct() {
  const { id } = useParams();

  const { data: order, isLoading } = useAuthSWR<Transaction>(`/api/v1/order/${id}`);
  const { data: merchant } = useAuthSWR<User>(order ? `/api/v1/account/${order.merchant_id}` : null);

  if (isLoading && order == null) {
    return <CircularProgress />;
  }

  return (
    <Card sx={{ m: 2 }}>
      {order ? (
        <>
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              Nama: {order.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Merchant: {merchant?.email}
            </Typography>
            <Typography variant="body2" fontSize={12}>
              Harga: Rp. {order.price}
            </Typography>
            <Typography variant="body2" fontSize={12}>
              Status: {order.status.type}
            </Typography>

            <Typography variant="h5">Barang:</Typography>
            {order.products.map((it) => {
              return (
                <React.Fragment key={it.id}>
                  <ProductCard product={it} />
                </React.Fragment>
              );
            })}
          </CardContent>
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
