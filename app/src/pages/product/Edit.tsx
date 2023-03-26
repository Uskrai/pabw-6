import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import useSWR, { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { Product, ProductForm } from "../../models/Product";
import Form from "./Form";

export default function EditProduct() {
  let { id } = useParams();

  let { data, isLoading, mutate: mutateNow } = useSWR<{ data: Product }>(
    `/api/v1/product/${id}`,
    (url) => axios.get(url)
  );

  let product = data?.data!;

  const navigate = useNavigate();
  const form = useForm<ProductForm>({
    defaultValues: {
      name: product?.name,
      description: product?.description,
      price: product?.price,
      stock: product?.stock,
    },
  });
  React.useEffect(() => form.reset(product), [isLoading])

  const { token } = useAuth();

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Form
      form={form}
      onClick={async (e) => {
        try {
          let res = await axios.put(`/api/v1/product/${product?.id}`, e, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          mutate("/api/v1/product");
          mutateNow();
          navigate(`/user/product/${product.id}`);
        } catch (e) {}
      }}
    />
  );
}
