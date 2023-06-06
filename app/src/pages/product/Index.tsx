import axios from "axios";
import React from "react";
import useSWR from "swr";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import CardActionArea from "@mui/material/CardActionArea";
import { useUser } from "../../hooks/useUser";
import { useQuery } from "@tanstack/react-query";
import TableDashboard from "@/layouts/TableDashboard";
import MaterialReactTable, { MRT_ColumnDef } from "material-react-table";
import { currencyFormatter } from "@/utils/formatter";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveRedEye from "@mui/icons-material/RemoveRedEye";
import { useConfirm } from "material-ui-confirm";
import { useAuth } from "@/hooks/useAuth";

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
  const { data, isLoading } = useQuery<{ data: GetProducts }>({
    queryKey: ["/api/v1/product"],
  });
  const confirm = useConfirm();

  let products = React.useMemo(
    () => data?.data?.products?.filter((it) => it.user_id == user?.user?.id),
    [user]
  );

  const { token } = useAuth();
  const onDelete = React.useCallback(
    async (product_id: string) => {
      try {
        await confirm({ description: "Are you sure?" });
      } catch (e) {
        return;
      }

      await axios.delete(`/api/v1/product/${product_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate("/user/product");

      products = products?.filter((it) => it.id != product_id);
    },
    [token]
  );

  const navigate = useNavigate();

  const dataColumns = [
    {
      header: "Nama",
      accessorKey: "name",
    },
    {
      header: "Stock",
      accessorKey: "stock",
    },
    {
      header: "Price",
      accessorFn: (row) => currencyFormatter.format(parseInt(row.price)),
    },
  ] as MRT_ColumnDef<Product>[];

  return (
    <TableDashboard title="Product" route="/user/product">
      <MaterialReactTable
        columns={dataColumns}
        data={products ?? []}
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
            <Box className="flex flex-row shrink w-16">
              <NavLink to={`/user/product/${row.original.id}`}>
                <IconButton>
                  <RemoveRedEye />
                </IconButton>
              </NavLink>
              <NavLink to={`/user/product/${row.original.id}/edit`}>
                <IconButton>
                  <EditIcon />
                </IconButton>
              </NavLink>
              <IconButton onClick={() => onDelete(row.original.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          );
        }}
        state={{
          isLoading,
        }}
      />
    </TableDashboard>
  );
  return (
    <div>
      <AppBar />

      <Grid container>
        <Grid item xs>
          <Link to={"/user/product/create"}>New</Link>
          {products
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
