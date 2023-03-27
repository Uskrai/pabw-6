import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

interface FormData {
  email: string;
  password: string;
}

export default function Login() {
  let { register, handleSubmit, formState } = useForm<FormData>();
  const auth = useAuth();
  const navigate = useNavigate();

  let onClick = async (e: FormData) => {
    try {
      let res = await axios.post("/api/v1/auth/login", {
        email: e.email,
        password: e.password,
      });

      auth.login(res.data.access_token);

      navigate("/");
    } catch (e) {
      //
    }
  };

  return (
    <div className="Login">
      <form className="login-form" onSubmit={handleSubmit(onClick)}>
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
