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
  Delivery,
  GetDelivery,
  GetTransaction,
  statusToString,
  Transaction,
} from "../../models/Transaction";
import { User } from "../../models/User";
import { Product } from "../../models/Product";

export default function Index() {
  const { data, isLoading } = useAuthSWR<GetDelivery>("/api/v1/delivery");

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <div className="App">
      <AppBar />

      <Grid container>
        <Grid item xs>
          {data?.deliveries.map((it) => (
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

function OrderCard({ order }: { order: Delivery }) {
  const navigate = useNavigate();
  const { data: merchant } = useAuthSWR<User>(
    `/api/v1/account/${order.user_id}`
  );

  return (
    <Card>
      <CardActionArea onClick={() => navigate(`/courier/delivery/${order.id}`)}>
        <CardContent>
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
