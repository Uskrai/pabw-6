import ShowDashboard from "@/layouts/ShowDashboard";
import { currencyFormatter } from "@/utils/formatter";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { useAuthSWR, useMutateAuth } from "../../hooks/useSWR";
import { User, UserRole } from "../../models/User";

interface Props {
  role: UserRole;
}

export default function Show(props: Props) {
  const { id } = useParams();

  const { data, isLoading } = useAuthSWR<User>(`/api/v1/account/${id}`);

  const navigate = useNavigate();
  const { token } = useAuth();

  const mutateAuth = useMutateAuth();

  if (isLoading) {
    return <CircularProgress />;
  }

  const user = data!;

  const onDelete = async () => {
    await axios.delete(`/api/v1/account/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    mutateAuth("/api/v1/account");
    navigate(`/admin/account/${props.role.toLowerCase()}`);
  };

  return (
    <ShowDashboard title="Account" route={`/admin/account/${props.role.toLowerCase()}`}>
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Nama: {user.name}
        </Typography>
        <Typography gutterBottom variant="body2" component="div">
          E-Mail: {user.email}
        </Typography>
        {/* <Typography variant="body2" color="text.secondary"> */}
        {/*   Deskripsi: {product.description} */}
        {/* </Typography> */}
        <Typography variant="body2" fontSize={12}>
          Role: {user.role}
        </Typography>

        <Typography variant="body2" fontSize={12}>
          Balance: {currencyFormatter.format(parseInt(user.balance))}
        </Typography>
        {/* <Typography variant="body2">Stok: {product.stock}</Typography> */}
      </CardContent>
      <CardActions>
        <Link to={`/admin/account/${props.role.toLowerCase()}/${user.id}/edit`}>
          Edit
        </Link>
        {/* <Link */}
        {/*   to={`/admin/account/${props.role.toLowerCase()}/${user.id}`} */}
        {/*   onClick={onDelete} */}
        {/* > */}
        {/*   Delete */}
        {/* </Link> */}
      </CardActions>
    </Card>
    </ShowDashboard>
  );
}
