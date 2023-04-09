import axios from "axios";
import React from "react";
import useSWR from "swr";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { Link, Outlet, useNavigate } from "react-router-dom";
import CardActionArea from "@mui/material/CardActionArea";
import { useUser } from "../../hooks/useUser";

const AppBar = React.lazy(() => import("../../AppBar"));

interface Product {
  id: string;
  user_id: string;

  name: string;
  description: string;
  price: string;
  stock: string;
  updated_at: string;
  deleted_at: string;
}

interface GetProducts {
  products: Product[];
}

export default function Index() {
  const user = useUser();
  const { data }: { data: GetProducts } = useSWR("/api/v1/product", (url) =>
    axios.get(url).then((it) => it.data)
  );

  return (
    <div>
      <AppBar />

      <Grid container>
        <Grid item xs>
          <Link to={"/user/product/create"}>New</Link>
          {data?.products
            ?.filter((it) => it.user_id == user?.user?.id)
            .map((it) => (
              <div key={it.id}>
                <ProductCard product={it} />
              </div>
            ))}
        </Grid>
        <Divider orientation="vertical" flexItem />
        <Grid item xs>
          <Outlet />
        </Grid>
      </Grid>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardActionArea onClick={() => navigate(`/user/product/${product.id}`)}>
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {product.description}
          </Typography>
          {/* <Typography variant="body2" fontSize={12}> */}
          {/*   Rp. {product.price} */}
          {/* </Typography> */}
          {/* <Typography variant="overline">{product.stock}</Typography> */}
        </CardContent>
      </CardActionArea>
    </Card>
  );
  //
}
