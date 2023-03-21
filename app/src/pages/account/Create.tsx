import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { UserForm } from "../../models/User";
import Form from "./Form";

export default function CreateProduct() {
  const form = useForm<UserForm>({});

  const { token } = useAuth();
  const navigate = useNavigate();

  return (
    <Form
      form={form}
      onClick={async (e) => {
        let res = await axios.post("/api/v1/account/", e, {
          headers: { Authorization: `Bearer ${token}` },
        });

        mutate("/api/v1/product");
        navigate(`/admin/account/${e.role}/${res.data.id}`);
      }}
    />
  );
}
