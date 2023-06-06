import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate, Link, NavLink } from "react-router-dom";
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
    <section className="bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8 dark:text-white">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
              Sign in to your account
            </h1>
            <form
              className="space-y-6 md:space-y-8"
              action="#"
              onSubmit={handleSubmit(handleError(onClick))}
            >
              <TextField
                {...register("email")}
                label="E-Mail"
                type="email"
                fullWidth
              />
              <TextField
                {...register("password")}
                label="Password"
                type="password"
                fullWidth
              />
              <Button
                type="submit"
                className="text-center w-full"
                disabled={formState.isSubmitting}
              >
                Sign in
              </Button>
              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Don’t have an account yet?{" "}
                <NavLink
                  to="/register"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                >
                  Sign up
                </NavLink>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
