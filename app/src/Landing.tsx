import axios from "axios";
import React from "react";
import { useNavigate } from "react-router-dom";
const AppBar = React.lazy(() => import("./AppBar"));
import useSWR from "swr";
import { GetProduct, Product } from "./models/Product";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";

export default function Landing() {
  const { data: productSwr } = useSWR<{ data: GetProduct }>(
    "/api/v1/product",
    (url) => axios.get(url)
  );

  const products = React.useMemo(
    () => productSwr?.data?.products.map((it) => it).reverse(),
    [productSwr?.data]
  );

  return (
    <div className="App">
      <AppBar />

      <Grid container spacing={4}>
        {products?.map((it) => (
          <Grid item key={it.id} xs={2}>
            <ProductCard product={it} />
          </Grid>
        ))}
      </Grid>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardActionArea
        onClick={() => navigate(`/${product.user_id}/${product.id}`)}
      >
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {product.name}
          </Typography>
          <Typography variant="body2" fontSize={15}>
            Rp. {product.price}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
  //
}
