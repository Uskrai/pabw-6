import React from "react";

import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuthSWR } from "../../hooks/useSWR";
import { useUser } from "../../hooks/useUser";
import { User } from "../../models/User";

const AppBar = React.lazy(() => import("../../AppBar"));

interface GetUsers {
  accounts: User[];
}

interface Props {
  role: "Customer" | "Courier";
}

export default function Index(props: Props) {
  let { data }: { data: GetUsers } = useAuthSWR("/api/v1/account");
  console.log(data, props.role);

  return (
    <div>
      <AppBar />

      <Grid container>
        <Grid item xs={4}>
          <Link to={"/product/create"}>New</Link>
          {data?.accounts
            ?.filter((it) => it.role == props.role)
            .map((it) => (
              <div key={it.id}>
                <ItemCard user={it} role={props.role}/>
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

function ItemCard({ user, role }: { user: User, role: string }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardActionArea onClick={() => navigate(`/admin/account/${role.toLowerCase()}/${user.id}`)}>
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {user.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.role}
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
