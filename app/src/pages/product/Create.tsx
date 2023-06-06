import FormDashboard from "@/layouts/FormDashboard";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { ProductForm } from "../../models/Product";
import Form from "./Form";

export default function CreateProduct() {
  const form = useForm<ProductForm>({});

  const { token } = useAuth();
  const navigate = useNavigate();

  return (
    <FormDashboard title={"Create Product"}>

    <Form
      form={form}
      onClick={async (e) => {
        const res = await axios.post("/api/v1/product/", e, {
          headers: { Authorization: `Bearer ${token}` },
        });

        mutate("/api/v1/product");
        navigate(`/user/product/${res.data.id}`);
      }}
    />
    </FormDashboard>
  );
}
