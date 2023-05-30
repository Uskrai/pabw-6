import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { handleError } from "./utils/error-handler";

interface FormData {
  email: string;
  password: string;
}

export default function Login() {
  const { register, handleSubmit, formState } = useForm<FormData>();
  const auth = useAuth();
  const navigate = useNavigate();

  const onClick = async (e: FormData) => {
      const res = await axios.post("/api/v1/auth/login", {
        email: e.email,
        password: e.password,
      });

      auth.login(res.data.access_token);

      navigate("/");
  };

  return (
    <div className="Login">
      <form className="login-form" onSubmit={handleSubmit(handleError(onClick))}>
        <label htmlFor="email">Email:</label>
        <input type="text" placeholder="Email" {...register("email")} />
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          placeholder="Password"
          {...register("password")}
        />
        <button disabled={formState.isSubmitting}>Login</button>
        <Link to="/register">Register</Link>
      </form>
    </div>
  );
}
