import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import CardActionArea from "@mui/material/CardActionArea";
import Divider from "@mui/material/Divider";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { Outlet, useNavigate } from "react-router-dom";
import AppBar from "../../AppBar";
import { useAuthSWR } from "../../hooks/useSWR";
import {
  GetOrder,
  GetTransaction,
  statusToString,
  Transaction,
} from "../../models/Transaction";
import { User } from "../../models/User";
import { Product } from "../../models/Product";

export default function Index() {
  const { data, isLoading } = useAuthSWR<GetTransaction>("/api/v1/transaction");

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <div className="App">
      <AppBar />

      <Grid container>
        <Grid item xs>
          {data?.transactions.map((it) => (
            <div key={it.id}>
              <OrderCard order={it} />
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

function OrderCard({ order }: { order: Transaction }) {
  const navigate = useNavigate();
  const { data: merchant } = useAuthSWR<User>(
    `/api/v1/account/${order.user_id}`
  );

  const { data: product } = useAuthSWR<Product>(
    `/api/v1/product/${order.products[0].id}`
  );

  return (
    <Card>
      <CardActionArea onClick={() => navigate(`/user/transaction/${order.id}`)}>
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {product ? product.name : <CircularProgress />}
            {order.products.length > 1 && (
              <div>+{order.products.length - 1} Produk lainnya</div>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {merchant == null ? <CircularProgress /> : <>{merchant.email}</>}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {statusToString(order.status.at(-1))}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
  //
}
