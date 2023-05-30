import CircularProgress from "@mui/material/CircularProgress";
import React, { Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useNavigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "./App.css";
import { AuthContext } from "./context/User";
import { useAuth, useProvidedAuth } from "./hooks/useAuth";
import { useUser } from "./hooks/useUser";
import { UserRole } from "./models/User";
import "react-toastify/dist/ReactToastify.css";

const Landing = React.lazy(() => import("./Landing"));
const Product = React.lazy(() => import("./Product"));
const OrderIndex = React.lazy(() => import("./pages/order/Index"));
const OrderShow = React.lazy(() => import("./pages/order/Show"));
const Login = React.lazy(() => import("./Login"));
const Register = React.lazy(() => import("./pages/auth/Register"));
const TransactionIndex = React.lazy(() => import("./pages/transaction/Index"));
const TransactionShow = React.lazy(() => import("./pages/transaction/Show"));
const AccountIndex = React.lazy(() => import("./pages/account/Index"));
const AccountShow = React.lazy(() => import("./pages/account/Show"));
const AccountEdit = React.lazy(() => import("./pages/account/Edit"));
const AccountCreate = React.lazy(() => import("./pages/account/Create"));
const ProductIndex = React.lazy(() => import("./pages/product/Index"));
const ProductShow = React.lazy(() => import("./pages/product/Show"));
const ProductEdit = React.lazy(() => import("./pages/product/Edit"));
const ProductCreate = React.lazy(() => import("./pages/product/Create"));
const CartIndex = React.lazy(() => import("./pages/cart/Index"));
const DeliveryIndex = React.lazy(() => import("./pages/delivery/Index"));
const DeliveryShow = React.lazy(() => import("./pages/delivery/Show"));

interface ProtectedRouteProps extends React.PropsWithChildren {
  login: boolean;
  role?: UserRole | UserRole[];
}
const ProtectedRoute = ({
  children,
  login: login,
  role,
}: ProtectedRouteProps) => {
  const auth = useAuth();
  const user = useUser();
  const navigator = useNavigate();
  login = login === true;

  const roles = typeof role === "string" ? [role] : role;

  const [isLoading, setIsLoading] = React.useState(true);

  // console.log(auth.isLoading, user.isLoading);

  React.useEffect(() => {
    if (auth.isLoading) {
      return;
    }
    if (auth.isLogin !== login) {
      return navigator("/");
    }

    if (roles != undefined) {
      if (user.isLoading) {
        return;
      }

      if (!roles.includes(user.user?.role ?? ("" as UserRole))) {
        return navigator("/");
      }
    }

    setIsLoading(false);
  }, [auth.isLoading, user?.isLoading, login, roles]);

  if (isLoading) {
    return <CircularProgress />;
  }

  return <>{children}</>;
};

const account = (role: "Customer" | "Courier") => {
  return {
    path: `/admin/account/${role.toLowerCase()}`,
    element: (
      <ProtectedRoute login={true} role="Admin">
        <AccountIndex role={role} />
      </ProtectedRoute>
    ),
    children: [
      {
        path: `/admin/account/${role.toLowerCase()}/create`,
        element: <AccountCreate role={role} />,
      },
      {
        path: `/admin/account/${role.toLowerCase()}/:id`,
        element: <AccountShow role={role} />,
      },
      {
        path: `/admin/account/${role.toLowerCase()}/:id/edit`,
        element: <AccountEdit />,
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
    path: "/:merchant_id/:product_id",
    element: <Product />,
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
    path: "/user/order",
    element: (
      <ProtectedRoute login={true} role="Customer">
        <OrderIndex />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/user/order/:id",
        element: <OrderShow />,
      },
    ],
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
  {
    path: "/user/transaction",
    element: (
      <ProtectedRoute login={true}>
        <TransactionIndex />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/user/transaction/:id",
        element: <TransactionShow />,
      },
    ],
  },
  {
    path: "/user/cart",
    element: (
      <ProtectedRoute login={true}>
        <CartIndex />
      </ProtectedRoute>
    ),
  },
  account("Customer"),
  account("Courier"),
  {
    path: "/courier/delivery",
    element: (
      <ProtectedRoute login={true} role="Courier">
        <DeliveryIndex />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/courier/delivery/:id",
        element: <DeliveryShow />,
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
        <ToastContainer />
      </AuthContext.Provider>
    </Suspense>
  );
};

export default App;
