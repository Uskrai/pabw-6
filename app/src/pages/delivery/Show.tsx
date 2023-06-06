import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import axios from "axios";
import React, { useMemo } from "react";
import { Controller, useForm, UseFormReturn } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import useSWR from "swr";
import { dateToString } from "../../helper";
import { useAuth } from "../../hooks/useAuth";
import { useAuthSWR, useMutateAuth } from "../../hooks/useSWR";
import { Product } from "../../models/Product";
import { statusToString, Transaction } from "../../models/Transaction";
import { User } from "../../models/User";
import { handleError } from "@/utils/error-handler";
import { useQueryClient } from "@tanstack/react-query";

export default function ShowProduct() {
  const { id } = useParams();

  const {
    data: order,
    isLoading,
    mutate: mutateNow,
    error,
  } = useAuthSWR<Transaction>(`/api/v1/delivery/${id}`);

  const { data: merchant } = useAuthSWR<User>(
    order ? `/api/v1/account/${order.user_id}` : null
  );

  const pickUpForm = useForm({
    defaultValues: {
      type: "",
    },
  });

  const { token } = useAuth();

  const reversedStatus = useMemo(
    () => order?.status?.map((it) => it).reverse(),
    [order?.status]
  );

  const last_status = reversedStatus?.at(0);
  const current_type = last_status?.type?.type || "";

  const shouldShowPickup = React.useMemo(
    () =>
      ["ArrivedInDestination", "ArrivedInMerchant"].includes(
        current_type || ""
      ),
    [reversedStatus]
  );

  const mutateAuth = useMutateAuth();
  const queryClient = useQueryClient();

  const pickUpType = pickUpForm.watch("type");

  const onPickUp = async (): Promise<void> => {};
  const navigate = useNavigate();

  const onChangeType = async (e: any): Promise<void> => {
    // console.log(e);
    if (e.type == "PickedUpByCourier") {
      await axios.post(
        `/api/v1/delivery/${id}/pickup`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } else {
      await axios.post(
        `/api/v1/delivery/${id}/change`,
        {
          type: {
            type: e.type,
            content: null,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }

    queryClient.invalidateQueries(["/api/v1/delivery"]);
    queryClient.invalidateQueries([`/api/v1/delivery/${id}`]);
    if (["ArrivedInDestination", "ArrivedInMerchant"].includes(e.type)) {
      navigate("/courier/delivery");
    }
  };

  if (isLoading && order == null) {
    return <CircularProgress />;
  }

  console.log(error);
  if (error?.response?.status == 403) {
    return null;
  }

  return (
    <Card sx={{ m: 2 }}>
      {order ? (
        <>
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              Nama: {order.id}
            </Typography>
            {/* <Typography variant="body2" color="text.secondary"> */}
            {/*   Customer: {merchant?.email} */}
            {/* </Typography> */}
            {/* <Typography variant="body2" fontSize={12}> */}
            {/*   Harga: Rp. {order.price} */}
            {/* </Typography> */}
            <Typography variant="body2" fontSize={12}>
              Status: {statusToString(order.status.at(-1))}
            </Typography>

            {/* <Typography variant="h5">Barang:</Typography> */}
            {/* <Stack> */}
            {/*   {order.products.map((it) => { */}
            {/*     return ( */}
            {/*       <Box key={it.id}> */}
            {/*         <ProductCard product={it} /> */}
            {/*       </Box> */}
            {/*     ); */}
            {/*   })} */}
            {/* </Stack> */}

            <Typography variant="h5">Status:</Typography>
            <Stack>
              {reversedStatus?.map((it) => {
                return (
                  <Box key={it.date}>
                    {statusToString(it)} {dateToString(it.date)}
                  </Box>
                );
              })}
            </Stack>
          </CardContent>

          <Selector
            value={current_type}
            pickUpForm={pickUpForm}
            onChangeType={onChangeType}
          />
        </>
      ) : null}
    </Card>
  );
}

interface SelectorProps {
  value: string;
  pickUpForm: UseFormReturn<any>;
  onChangeType: (e: any) => Promise<void>;
}

function Selector(props: SelectorProps) {
  const value = props.value;
  const pickUpForm = props.pickUpForm;
  const onChangeType = props.onChangeType;
  const pickUpType = pickUpForm.watch("type");

  const allowed_type_value: Record<string, string[]> = {
    WaitingForCourier: ["PickedUpByCourier"],
    PickedUpByCourier: ["SendBackToMerchant", "ArrivedInDestination"],
    SendBackToMerchant: ["ArrivedInMerchant"],
  };

  const value_string: Record<string, string> = {
    PickedUpByCourier: "Pick Up",
    SendBackToMerchant: "Send Back",
    ArrivedInDestination: "Arrived",
    ArrivedInMerchant: "Arrived",
  };

  const type_value = allowed_type_value[value];
  // console.log(type_value);

  if (type_value?.length > 1) {
    return (
      <CardActions>
        <FormControl>
          <Controller
            name="type"
            control={pickUpForm.control}
            render={({ field }) => (
              <Select {...field}>
                {type_value?.map((it) => {
                  return (
                    <MenuItem key={it} value={it}>
                      {value_string[it]}
                    </MenuItem>
                  );
                })}
              </Select>
            )}
          />
          <Button
            size="small"
            color="primary"
            onClick={pickUpForm.handleSubmit(handleError(onChangeType))}
            disabled={pickUpForm.formState.isSubmitting || pickUpType == ""}
          >
            Update
          </Button>
        </FormControl>
      </CardActions>
    );
  } else if (type_value?.length == 1) {
    const value = value_string[type_value[0] as any] as any;
    if (pickUpForm.getValues("type") != type_value[0]) {
      React.useEffect(() => {
        pickUpForm.setValue("type", type_value[0]);
      }, [value]);
    }

    // console.log(value)
    return (
      <CardActions>
        <Button
          size="small"
          color="primary"
          onClick={pickUpForm.handleSubmit(handleError(onChangeType))}
          disabled={pickUpForm.formState.isSubmitting}
        >
          {value}
        </Button>
      </CardActions>
    );
  } else {
    return null;
  }
}

function ProductCard({
  product: orderProduct,
}: {
  product: { id: string; quantity: string };
}) {
  const { data: product, isLoading } = useSWR<{ data: Product }>(
    `/api/v1/product/${orderProduct.id}`,
    (url) => axios.get(url)
  );

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <div>
      {orderProduct.quantity} x {product?.data?.name}
    </div>
  );
}
