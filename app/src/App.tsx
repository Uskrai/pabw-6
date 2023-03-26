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
const Account = React.lazy(() => import("./pages/account/Index"));
const AccountShow = React.lazy(() => import("./pages/account/Show"));
const AccountEdit =React.lazy(() => import("./pages/account/Edit"));
const AccountCreate = React.lazy(() => import("./pages/account/Create"));
const ProductIndex = React.lazy(() => import("./pages/product/Index"));
const ProductShow = React.lazy(() => import("./pages/product/Show"));
const ProductEdit = React.lazy(() => import("./pages/product/Edit"));
const ProductCreate  = React.lazy(() => import("./pages/product/Create"));

interface ProtectedRouteProps extends React.PropsWithChildren {
  login: boolean;
  role?: "Admin" | "Customer" | "Courier";
}
const ProtectedRoute = ({
  children,
  login: login,
  role,
}: ProtectedRouteProps) => {
  const auth = useAuth();
  const user = useUser();
  login = login === true;

  if (auth.isLogin !== login) {
    return <Navigate to="/" />;
  }

  if (role != undefined) {
    if (user.user?.role !== role) {
      return <Navigate to="/" />;
    }
  }

  return <>{children}</>;
};

const account = (role: "Customer" | "Courier") => {
  return {
    path: `/admin/account/${role.toLowerCase()}`,
    element: (
      <ProtectedRoute login={true} role="Admin">
        <Account role={role} />
      </ProtectedRoute>
    ),
    children: [
      {
        path: `/admin/account/${role.toLowerCase()}/create`,
        element: <AccountCreate role={role}/>,
      },
      {
        path: `/admin/account/${role.toLowerCase()}/:id`,
        element: <AccountShow role={role}/>,
      },
      {
        path: `/admin/account/${role.toLowerCase()}/:id/edit`,
        element: <AccountEdit/>,
      },
    ],
  };
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
    children: [],
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
        <Register />
      </ProtectedRoute>
    ),
  },
  {
    path: "/user/product",
    element: (
      <ProtectedRoute login={true}>
        <ProductIndex />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/user/product/:id",
        element: <ProductShow />,
      },
      {
        path: "/user/product/create",
        element: <ProductCreate />,
      },
      {
        path: "/user/product/:id/edit",
        element: <ProductEdit />,
      },
    ],
  },
  account("Customer"),
  account("Courier"),
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
