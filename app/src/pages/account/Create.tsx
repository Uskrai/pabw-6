import FormDashboard from "@/layouts/FormDashboard";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { UserForm, UserRole } from "../../models/User";
import Form from "./Form";

interface Props {
  role: UserRole;
}

export default function CreateProduct(props: Props) {
  const form = useForm<UserForm>({
    defaultValues: {
      role: props.role,
    },
  });

  const { token } = useAuth();
  const navigate = useNavigate();

  return (
    <FormDashboard title={`Create ${props.role}`}>
    <Form
      form={form}
      withPassword={true}
      onClick={async (e) => {
        const res = await axios.post("/api/v1/account/", e, {
          headers: { Authorization: `Bearer ${token}` },
        });

        mutate("/api/v1/account");
        navigate(`/admin/account/${e.role}/${res.data.id}`);
      }}
    />
    </FormDashboard >
  );
}
