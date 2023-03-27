import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import CardActionArea from "@mui/material/CardActionArea";
import Divider from "@mui/material/Divider";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { Link, Outlet, useNavigate } from "react-router-dom";
import AppBar from "../../AppBar";
import { useAuthSWR } from "../../hooks/useSWR";
import { GetOrder, Transaction } from "../../models/Transaction";
import { User } from "../../models/User";

export default function ShowProduct() {
  let { data, isLoading } = useAuthSWR<GetOrder>(`/api/v1/order`);

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <div className="App">
      <AppBar />

      <Grid container>
        <Grid item xs>
          {data?.orders.map((it) => (
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
  let { data: merchant, isLoading } = useAuthSWR<User>(
    `/api/v1/account/${order.merchant_id}`
  );

  return (
    <Card>
      <CardActionArea onClick={() => navigate(`/user/order/${order.id}`)}>
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {order.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {merchant == null ? <CircularProgress /> : <>{merchant.email}</>}
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
