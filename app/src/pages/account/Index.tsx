import React, { useMemo } from "react";

import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthSWR } from "../../hooks/useSWR";
import { useUser } from "../../hooks/useUser";
import { User } from "../../models/User";
import { CircularProgress } from "@mui/material";
import MaterialReactTable, { MRT_ColumnDef } from "material-react-table";
import { currencyFormatter } from "@/utils/formatter";
import TableDashboard from "@/layouts/TableDashboard";

const AppBar = React.lazy(() => import("../../AppBar"));

interface GetUsers {
  accounts: User[];
}

interface Props {
  role: "Customer" | "Courier";
}

export default function Index(props: Props) {
  const { data, isLoading } = useAuthSWR<GetUsers>("/api/v1/account");

  const accounts = useMemo(
    () => data?.accounts?.filter((it) => it.role == props.role),
    [data?.accounts, props.role]
  );

  const navigate = useNavigate();

  const dataColumns = [
    {
      accessorKey: "name",
      header: "Nama",
    },
    {
      accessorKey: "email",
      header: "E-Mail",
    },
    {
      accessorKey: "role",
      header: "Role",
    },
    {
      header: "Balance",
      accessorFn: (row) => currencyFormatter.format(parseInt(row.balance)),
    },
  ] as MRT_ColumnDef<User>[];

  return (
    <TableDashboard
      title={props.role}
      route={`/admin/account/${props.role.toLowerCase()}`}
    >
      <MaterialReactTable
        columns={dataColumns}
        data={accounts ?? []}
        enableColumnActions={true}
        enableColumnFilters={true}
        enablePagination={true}
        enableSorting={true}
        enableBottomToolbar={true}
        enableRowActions
        enableTopToolbar={true}
        enableRowNumbers={true}
        muiTableBodyRowProps={{ hover: false }}
        renderRowActions={({ row }) => {
          return (
            <Box>
              <NavLink
                to={`/admin/account/${props.role.toLowerCase()}/${
                  row.original.id
                }/edit`}
              >
                <IconButton>
                  <EditIcon />
                </IconButton>
              </NavLink>
            </Box>
          );
        }}
        state={{
          isLoading,
        }}
      />
      {/* <Grid container> */}
      {/*   <Grid item xs> */}
      {/*     {!isLoading ? ( */}
      {/*       <> */}
      {/*         <Link to={`/admin/account/${props.role.toLowerCase()}/create`}> */}
      {/*           New */}
      {/*         </Link> */}
      {/*         {accounts?.map((it) => ( */}
      {/*           <div key={it.id}> */}
      {/*             <ItemCard user={it} role={props.role} /> */}
      {/*           </div> */}
      {/*         ))} */}
      {/*       </> */}
      {/*     ) : ( */}
      {/*       <CircularProgress /> */}
      {/*     )} */}
      {/*   </Grid> */}
      {/**/}
      {/*   <Divider orientation="vertical" flexItem /> */}
      {/*   <Grid item xs> */}
      {/*     <Outlet /> */}
      {/*   </Grid> */}
      {/* </Grid> */}
    </TableDashboard>
  );
}
