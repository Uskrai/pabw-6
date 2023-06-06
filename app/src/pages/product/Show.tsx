import ShowDashboard from "@/layouts/ShowDashboard";
import { handleError } from "@/utils/error-handler";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import axios from "axios";
import { useConfirm } from "material-ui-confirm";
import { Link, useNavigate, useParams } from "react-router-dom";
import useSWR, { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { Product } from "../../models/Product";

export default function ShowProduct() {
  const { id } = useParams();

  const { data, isLoading } = useSWR<{ data: Product }>(
    `/api/v1/product/${id}`,
    (url) => axios.get(url)
  );
  const navigate = useNavigate();
  const { token } = useAuth();
  const confirm = useConfirm();

  if (isLoading || data?.data == null) {
    return <CircularProgress />;
  }

  const product = data?.data;

  const onDelete = async () => {
    try {
      await confirm({ description: "Are you sure?" });
    } catch (e) {}

    await axios.delete(`/api/v1/product/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    navigate("/user/product");
  };

  return (
    <ShowDashboard title="Product" route="/user/product">
      <Card sx={{ m: 2 }} variant="outlined">
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Nama: {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deskripsi: {product.description}
          </Typography>
          <Typography variant="body2" fontSize={12}>
            Harga: Rp. {product.price}
          </Typography>
          <Typography variant="body2">Stok: {product.stock}</Typography>
        </CardContent>
        <CardActions>
          <Link to={`/user/product/${product.id}/edit`}>Edit</Link>
          <Link to={`/user/product/${product.id}`} onClick={handleError(onDelete)}>
            Delete
          </Link>
        </CardActions>
      </Card>
    </ShowDashboard>
  );
}
