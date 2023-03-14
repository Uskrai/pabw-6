import CircularProgress from "@mui/material/CircularProgress";
import React, { Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./App.css";
import { AuthContext } from "./context/User";
import { useAuth, useProvidedAuth } from "./hooks/useAuth";
import { useUser } from "./hooks/useUser";

const Landing = React.lazy(() => import("./Landing"));
const Login = React.lazy(() => import("./Login"));
const Register = React.lazy(() => import("./pages/auth/Register"));
const Account = React.lazy(() => import("./Account"));
const Product = React.lazy(() => import("./Product"));
const ShowProduct = React.lazy(() => import("./pages/product/Show"));
const EditProduct = React.lazy(() => import("./pages/product/Edit"));
const CreateProduct = React.lazy(() => import("./pages/product/Create"));

interface ProtectedRouteProps extends React.PropsWithChildren {
  login: boolean;
  role?: "Admin" | "Customer" | "Courier";
}

const ProtectedRoute = ({ children, login: login, role }: ProtectedRouteProps) => {
  const auth = useAuth();
  login = login === true;

  if (auth.isLoading) {
    return <CircularProgress/>
  }

  if (auth.isLogin !== login) {
    return <Navigate to="/" />;
  }

  if (role != undefined) {
    const user = useUser();
    if (user.isLoading) {
      return <CircularProgress/>;
    }
    if (user.user?.role !== role) {
      return <Navigate to="/" />
    }
  }


  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
    children: [
    ]
  },
  {
    path: "/product",
    element: (
      <ProtectedRoute login={true}>
        <Product />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/product/create",
        element: <CreateProduct />
      },
      {
        path: "/product/:id",
        element: <ShowProduct />
      },
      {
        path: "/product/:id/edit",
        element: <EditProduct />
      },
    ]
  },
  {
    path: "/login",
    element: (
      <ProtectedRoute login={false}>
        <Login />
      </ProtectedRoute>
    ),
  },
  {
    path: "/register",
    element: (
    <ProtectedRoute login={false}>
      <Register/>
      </ProtectedRoute>
    )
  },
  {
    path: "/admin/account",
    element: (
      <ProtectedRoute login={true} role="Admin">
        <Account />
      </ProtectedRoute>
    )
  }
]);

const App = () => {
  const auth = useProvidedAuth();

  return (
    <Suspense fallback={<CircularProgress />}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </Suspense>
  );
};

export default App;
