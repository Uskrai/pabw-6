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
const Login = React.lazy(() => import("./Login"));
const Register = React.lazy(() => import("./pages/auth/Register"));
const ProductIndex = React.lazy(() => import("./pages/product/Index"));
const ProductShow = React.lazy(() => import("./pages/product/Show"));
const ProductEdit = React.lazy(() => import("./pages/product/Edit"));
const ProductCreate  = React.lazy(() => import("./pages/product/Create"));

interface ProtectedRouteProps extends React.PropsWithChildren {
  login: boolean;
}

const ProtectedRoute = ({
  children,
  login: login,
}: ProtectedRouteProps) => {
  const auth = useAuth();
  const user = useUser();
  login = login === true;

  if (auth.isLoading) {
    return <CircularProgress />;
  }

  if (auth.isLogin !== login) {
    return <Navigate to="/" />;
  }


  return <>{children}</>;
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
    path: "/product",
    element: (
      <ProtectedRoute login={true}>
        <ProductIndex />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/product/:id",
        element: <ProductShow />,
      },
      {
        path: "/product/create",
        element: <ProductCreate />,
      },
      {
        path: "/product/:id/edit",
        element: <ProductShow />,
      },
    ],
  },
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
