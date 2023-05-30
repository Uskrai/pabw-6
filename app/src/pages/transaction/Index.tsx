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
import AppDashboard from "@/layouts/AppDashboard";
import MaterialReactTable, { MRT_ColumnDef } from "material-react-table";
import TableDashboard from "@/layouts/TableDashboard";

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

// export default function Index() {
//
//   const { data, isLoading } = useAuthSWR<GetTransaction>("/api/v1/transaction");
//
//   const dataColumns = [
//     {
//       accessorKey: "name",
//       header: "Nama",
//     },
//     {
//       accessorKey: "address",
//       header: "Alamat",
//     },
//     {
//       accessorKey: "email",
//       header: "E-Mail",
//     },
//   ] as MRT_ColumnDef<Transaction>[];
//
//   if (isLoading) {
//     return <CircularProgress />;
//   }
//
//   return (
//     <TableDashboard title="Akun" route="/admin/account">
//       <MaterialReactTable
//         columns={dataColumns}
//         data={data?.transactions || []}
//         enableColumnActions={true}
//         enableColumnFilters={true}
//         enablePagination={true}
//         enableSorting={true}
//         enableBottomToolbar={true}
//         enableRowActions={true}
//         enableTopToolbar={true}
//         enableRowNumbers={true}
//         muiTableBodyRowProps={{ hover: false }}
//         // renderRowActions={({ row }) => (
//         //   <MenuItem>
//         //     <div className="flex items-center justify-center gap-2">
//         //       <Link
//         //         className="bg-yellow-600 rounded p-2 flex-1 focus:outline-none border-2 border-orange-400 text-white"
//         //         href={`/admin/account/${row.original.id}/edit`}
//         //       >
//         //         <Edit className="" />
//         //       </Link>
//         //       <Link
//         //         className="bg-red-600 rounded p-2 flex-1 focus:outline-none border-2 border-red-400 text-white"
//         //         href={`/admin/account/${row.original.id}`}
//         //         onClick={() => {
//         //           //
//         //         }}
//         //       >
//         //         <Delete className="" />
//         //       </Link>
//         //     </div>
//         //   </MenuItem>
//         // )}
//         state={{
//           isLoading: isLoading && data == null,
//         }}
//       />
//     </TableDashboard>
//   );
// }

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
