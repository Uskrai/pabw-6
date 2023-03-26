import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { useAuthSWR } from "../../hooks/useSWR";
import { User, UserRole } from "../../models/User";

interface Props {
  role: UserRole;
}

export default function Show(props: Props) {
  let { id } = useParams();

  let { data, isLoading } = useAuthSWR<User>(
    `/api/v1/account/${id}`,
  );

  const navigate = useNavigate();
  const { token } = useAuth();

  if (isLoading) {
    return <CircularProgress />;
  }

  let user = data!;

  let onDelete = async () => {
    await axios.delete(`/api/v1/account/${id}`, { headers: {Authorization: `Bearer ${token}`}});
    mutate("/api/v1/account");
    navigate(`/admin/account/${props.role.toLowerCase()}`);
  }

  return (
    <Card sx={{ m: 2}}>
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Nama: {user.email}
        </Typography>
        {/* <Typography variant="body2" color="text.secondary"> */}
        {/*   Deskripsi: {product.description} */}
        {/* </Typography> */}
        <Typography variant="body2" fontSize={12}>
          Role: {user.role}
        </Typography>

        <Typography variant="body2" fontSize={12}>
          Balance: {user.balance}
        </Typography>
        {/* <Typography variant="body2">Stok: {product.stock}</Typography> */}
      </CardContent>
      <CardActions>
        <Link to={`/admin/account/${props.role.toLowerCase()}/${user.id}/edit`}>Edit</Link>
        <Link to={`/admin/account/${props.role.toLowerCase()}/${user.id}`} onClick={onDelete}>Delete</Link>
      </CardActions>
    </Card>
  );
}
