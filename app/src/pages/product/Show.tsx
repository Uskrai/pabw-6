import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import useSWR, { mutate } from "swr";
import { useAuth } from "../../hooks/useAuth";
import { Product } from "../../models/Product";

export default function ShowProduct() {
  let { id } = useParams();

  let { data, isLoading } = useSWR<{ data: Product }>(
    `/api/v1/product/${id}`,
    (url) => axios.get(url)
  );
  const navigate = useNavigate();
  const { token } = useAuth();

  if (isLoading) {
    return <CircularProgress />;
  }

  let product = data?.data!;

  let onDelete = async () => {
    await axios.delete(`/api/v1/product/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    mutate("/api/v1/product");
    navigate("/user/product");
  };

  return (
    <Card sx={{ m: 2 }}>
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
        <Link to={`/user/product/${product.id}`} onClick={onDelete}>
          Delete
        </Link>
      </CardActions>
    </Card>
  );
}
