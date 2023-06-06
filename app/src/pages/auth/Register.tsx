import { handleError } from "@/utils/error-handler";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import axios from "axios";
import { useForm } from "react-hook-form";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const { register, handleSubmit, formState } = useForm<FormData>();
  const auth = useAuth();
  const navigate = useNavigate();

  const onClick = async (e: FormData) => {
    console.log(e.confirmPassword);
    let res = await axios.post("/api/v1/auth/register", {
      name: e.name,
      email: e.email,
      password: e.password,
      confirm_password: e.confirmPassword,
    });

    res = await axios.post("/api/v1/auth/login", {
      email: e.email,
      password: e.password,
    });
    auth.login(res.data.access_token);

    navigate("/");
  };

  return (
    <section className="bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        {/* <a */}
        {/*   href="#" */}
        {/*   className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white" */}
        {/* > */}
        {/*   <img */}
        {/*     className="w-8 h-8 mr-2" */}
        {/*     src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/logo.svg" */}
        {/*     alt="logo" */}
        {/*   /> */}
        {/*   Flowbite */}
        {/* </a> */}
        <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
              Create New Account
            </h1>
            <form
              className="space-y-6 md:space-y-8"
              action="#"
              onSubmit={handleSubmit(handleError(onClick))}
            >
              <TextField
                {...register("name")}
                label="Name"
                type="text"
                fullWidth
              />
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

              <TextField
                {...register("confirmPassword")}
                label="Confirm Password"
                type="password"
                fullWidth
              />
              <Button
                type="submit"
                className="text-center w-full"
                disabled={formState.isSubmitting}
              >
                Sign Up
              </Button>
              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Already have an account?{" "}
                <NavLink
                  to="/login"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                >
                  Sign In
                </NavLink>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
