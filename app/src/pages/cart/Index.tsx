import axios from "axios";
import React from "react";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { Link, Outlet, useNavigate } from "react-router-dom";
import CardActionArea from "@mui/material/CardActionArea";
import { useUser } from "../../hooks/useUser";
import { CartModel } from "@/models/Cart";
import { useAuthSWR } from "@/hooks/useSWR";
import { User } from "@/models/User";
import List from "@mui/material/List";
import { makeStyles } from "@mui/styles";
import CardMedia from "@mui/material/CardMedia";
import Collapse from "@mui/material/Collapse";
import CardHeader from "@mui/material/CardHeader";
import CardActions from "@mui/material/CardActions";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { styled } from "@mui/material/styles";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import { Button, TextField } from "@mui/material";
import { currencyFormatter } from "@/utils/formatter";
import { useAuth } from "@/hooks/useAuth";
import { Product } from "@/models/Product";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { handleError } from "@/utils/error-handler";
import { useQueryClient } from "@tanstack/react-query";

const AppBar = React.lazy(() => import("../../AppBar"));

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? "rotate(0deg)" : "rotate(180deg)",
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
}));

interface GetCart {
  carts: CartModelForm[];
}

interface CartModelForm extends CartModel {
  checked: boolean;
}

interface GroupedCart {
  merchant_id: string;
  items: CartModelForm[];
}

// A little bit simplified version
const groupBy = <T, K extends keyof any>(arr: T[], key: (i: T) => K) =>
  arr.reduce((groups, item) => {
    (groups[key(item)] ||= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);

export default function Index() {
  const user = useUser();
  const { data, isLoading, mutate } = useAuthSWR<GetCart>("/api/v1/cart");

  const cartGroupedByMerchant: GroupedCart[] = React.useMemo(() => {
    return Object.entries(
      groupBy(data?.carts || [], (it) => it["merchant_id"])
    ).map(([id, it]) => {
      return {
        merchant_id: id,
        items: it,
      };
    });
  }, [data?.carts]);

  return (
    <div>
      <AppBar />

      <Grid container>
        <Grid item xs>
          {/* <Link to={"/user/product/create"}>New</Link> */}
          {/* <List> */}
          {cartGroupedByMerchant
            // ?.filter((it) => it.user_id == user?.user?.id)
            .map((it) => (
              <CartCard key={it.merchant_id} cart={it} />
            ))}
          {/* </List> */}
        </Grid>

        {/* <Grid item xs>
          <Outlet />
        </Grid> */}
      </Grid>
    </div>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    marginTop: 15,
  },
  details: {
    display: "flex",
    flexDirection: "column",
  },
  content: {
    flex: "1 0 auto",
  },
  cover: {
    width: 151,
  },
}));

function CartCard({ cart }: { cart: GroupedCart }) {
  const classes = useStyles();

  const { data: merchant } = useAuthSWR<User>(
    `/api/v1/account/${cart.merchant_id}`
  );

  const [expanded, setExpanded] = React.useState(true);
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const form = useForm({
    defaultValues: {
      cart: cart.items.map((it) => ({ ...it, checked: true })),
    },
  });

  const formCart = useFieldArray({
    control: form.control,
    keyName: "field_id",
    name: "cart",
  });

  const navigate = useNavigate();

  const { token } = useAuth();
  const [products, setProducts] = React.useState<Product[]>([]);

  React.useEffect(() => {
    if (token == null) {
      return;
    }

    let products_id = cart.items.map((it) => it.product_id);

    let prods: Product[] = [];

    let futures = [];

    for (const id of products_id) {
      let fut = (async () => {
        let it = await axios.get(`/api/v1/product/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        prods.push(it.data as Product);

        setProducts([...prods]);
      })();

      futures.push(fut);
    }

    (async () => {
      await Promise.all(futures);

      setProducts([...prods]);
    })();
  }, []);

  const formWatchCart = form.watch("cart");

  const totalPrice = React.useMemo(() => {
    return formWatchCart
      .filter((it) => it.checked != false)
      .map(
        (it) =>
          it.quantity *
          parseInt(
            products.find((product) => product.id == it.product_id)?.price ??
              "0"
          )
      )
      .reduce((a, b) => a + b, 0);
  }, [
    formWatchCart.map((it) => it.quantity),
    formWatchCart.map((it) => it.checked),
    products,
  ]);

  const queryClient = useQueryClient();
  const mutate = React.useCallback(() => queryClient.invalidateQueries({queryKey: ['/api/v1/cart']}), [queryClient])

  async function onDelete(index: number) {
    let cart = formCart.fields.at(index);

    const result = await axios.delete(`/api/v1/cart/${cart?.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    formCart.remove(index);
    // mutate(["/api/v1/cart"]);
    mutate()
  }

  async function onBuy(e: { cart: CartModelForm[] }) {
    const result = await axios.post(
      `/api/v1/order`,
      {
        products: e.cart
          .filter((it) => it.checked != false)
          .map((it) => {
            return {
              product_id: it.product_id,
              quantity: it.quantity,
            };
          }),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    navigate(`/user/order/${result.data.id}`);
  }

  if (formCart.fields.length == 0) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto mt-2">
      <Card className="p-4">
        <div className="flex gap-2">
          <Typography variant="h5" className="flex gap-2">
            {/* <input type="checkbox" /> */}
            {merchant?.name}
          </Typography>
          {/* <CardHeader title={merchant?.email} /> */}
        </div>
        <CardActions>
          <ExpandMore
            expand={expanded}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMoreIcon />
          </ExpandMore>
        </CardActions>
        <Collapse in={expanded}>
          {formCart.fields?.map((it, index) => {
            const product = products.find(
              (product) => product.id == it.product_id
            );

            if (product == null) {
              return <div key={it.id}>Loading...</div>;
            }

            return (
              <div key={it.id} className="flex gap-2 mb-3">
                <label>
                  <input
                    type="checkbox"
                    {...form.register(`cart.${index}.checked`)}
                    defaultChecked={
                      form.formState.defaultValues?.cart?.at(index)?.checked
                    }
                  />
                </label>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Typography>{product?.name}</Typography>
                    <Typography>
                      Harga:{" "}
                      {currencyFormatter.format(
                        parseInt(product?.price) * it.quantity
                      )}
                    </Typography>
                    <Typography>Stok: {product?.stock}</Typography>
                  </div>
                  <TextField
                    label="Kuantitas"
                    type="number"
                    variant="outlined"
                    size="small"
                    {...form.register(`cart.${index}.quantity`, {
                      max: {
                        value: product?.stock,
                        message: "Kuantitas harus lebih kecil dari stok barang",
                      },
                    })}
                    defaultValue={
                      form.formState.defaultValues?.cart?.at(index)?.quantity
                    }
                    error={
                      form?.formState?.errors?.cart?.at?.(index)?.quantity != null
                    }
                    helperText={
                      form?.formState.errors.cart?.at?.(index)?.quantity?.message
                    }
                  />

                  <Button
                    onClick={form.handleSubmit(handleError(() => onDelete(index)))}
                    disabled={form.formState.isSubmitting}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </Collapse>
        {/* </CardActionArea> */}
      </Card>

      <div className="flex align-top justify-between bg-gray-500 mt-2 rounded-md p-2">
        <div className="flex flex-col gap-2 ml-2">
          <Typography>Total Harga</Typography>
          <Typography>{currencyFormatter.format(totalPrice)}</Typography>
        </div>
        <Button
          onClick={form.handleSubmit(handleError(onBuy))}
          disabled={form.formState.isSubmitting}
        >
          Buy Now
        </Button>
      </div>
    </div>
  );
  //
}
