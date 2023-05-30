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
import { useUser } from "./hooks/useUser";

export default function Landing() {
  const { data: productSwr } = useSWR<{ data: GetProduct }>(
    "/api/v1/product",
    (url) => axios.get(url)
  );

  const user = useUser();

  const products = React.useMemo(
    () => productSwr?.data?.products.filter(it => it.user_id != user?.user?.id).map((it) => it).reverse(),
    [productSwr?.data, user?.user?.id]
  );

  return (
    <div className="App">
      <AppBar />

      <div className="max-w-7xl mx-auto mt-10">
        <Grid container spacing={4}>
          {products?.map((it) => (
            <Grid item key={it.id} xs={2}>
              <ProductCard product={it} />
            </Grid>
          ))}
        </Grid>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  return (
    <Card className="h-full">
      <CardActionArea className="h-full"
        onClick={() => navigate(`/${product.user_id}/${product.id}`)}
      >
        <CardContent className="flex flex-col justify-between">
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
