import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import axios from "axios";
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useSWR, { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { useAuthSWR } from "../../hooks/useSWR";
import { Product } from "../../models/Product";
import { Transaction } from "../../models/Transaction";

export default function ShowProduct() {
  let { id } = useParams();

  let { data, isLoading } = useAuthSWR<Transaction>(`/api/v1/order/${id}`);

  const navigate = useNavigate();
  const { token } = useAuth();

  if (isLoading && data == null) {
    return <CircularProgress />;
  }

  let onDelete = async () => {
    await axios.delete(`/api/v1/product/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    mutate("/api/v1/product");
    navigate("/user/product");
  };

  return (
    <Card sx={{ m: 2 }}>
      {data ? (
        <>
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              Nama: {data.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Merchant: {data.merchant_id}
            </Typography>
            <Typography variant="body2" fontSize={12}>
              Harga: Rp. {data.price}
            </Typography>
            <Typography variant="body2" fontSize={12}>
              Status: {data.status.type}
            </Typography>

            <Typography variant="h5">Product:</Typography>
            {data.products.map((it) => {
              return (
                <React.Fragment key={it.id}>
                  <ProductCard product={it} />
                </React.Fragment>
              );
            })}
          </CardContent>
          {/* <CardActions> */}
          {/*   <Link to={`/user/product/${product.id}/edit`}>Edit</Link> */}
          {/*   <Link to={`/user/product/${product.id}`} onClick={onDelete}>Delete</Link> */}
          {/* </CardActions> */}
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
