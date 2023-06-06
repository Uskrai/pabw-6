import Card from "@mui/material/Card";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
  GetTransaction,
  statusToString,
  Transaction,
} from "../../models/Transaction";
import { User } from "../../models/User";
import { Product } from "../../models/Product";
import React from "react";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";

export default function Index() {
  const { data, isLoading } = useAuthSWR<GetTransaction>("/api/v1/transaction");

  const group = React.useMemo(() => {
    return [
      {
        name: "Processing",
        child: data?.transactions?.filter((it) =>
          ["WaitingForMerchantConfirmation", "ProcessingInMerchant"].includes(
            it?.status?.at?.(-1)?.type?.type ?? ""
          )
        ),
      },
      {
        name: "Delivering",
        child: data?.transactions?.filter((it) =>
          ["WaitingForCourier", "PickedUpByCourier"].includes(
            it?.status?.at?.(-1)?.type?.type ?? ""
          )
        ),
      },
      {
        name: "Arrived",
        child: data?.transactions?.filter((it) =>
          ["ArrivedInDestination"].includes(
            it?.status?.at?.(-1)?.type?.type ?? ""
          )
        ),
      },
      {
        name: "Delivering Back to Merchant",
        child: data?.transactions?.filter((it) =>
          ["SendBackToMerchant", "WaitingForMerchantWhenSendBack"].includes(
            it?.status?.at?.(-1)?.type?.type ?? ""
          )
        ),
      },
    ];
  }, [data]);

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <div className="App">
      <AppBar />

      <Grid container>
        <Grid item xs>
          <List>
            {group.map((it) => (
              <GroupList key={it.name} name={it.name} child={it.child ?? null} />
            ))}
          </List>
        </Grid>
        <Divider orientation="vertical" flexItem />
        <Grid item xs>
          <Outlet />
        </Grid>
      </Grid>
    </div>
  );
}

function GroupList({
  name,
  child,
}: {
  name: string;
  child: Transaction[] | null;
}) {
  const [open, setOpen] = React.useState(false);
  const handleClick = () => {
    setOpen(!open);
  };

  return child?.length != undefined && child?.length > 0 ? (
    <div >
      <ListItemButton onClick={handleClick}>
        <ListItemText primary={`${name} (${child?.length})`} />
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>
      <Collapse key={name} in={open}>
        {child?.map((it) => (
          <div key={it.id}>
            <OrderCard order={it} />{" "}
          </div>
        ))}
      </Collapse>
    </div>
  ) : null;
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
            {merchant == null ? <CircularProgress /> : <>{merchant.name}</>}
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
