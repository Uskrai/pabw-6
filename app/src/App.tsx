import CircularProgress from "@mui/material/CircularProgress";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import axios from "axios";
import { ConfirmProvider } from "material-ui-confirm";

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
  return [
    {
      path: `/admin/account/${role.toLowerCase()}`,
      element: (
        <ProtectedRoute login={true} role="Admin">
          <AccountIndex role={role} />
        </ProtectedRoute>
      ),
    },
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
      element: <AccountEdit role={role}/>,
    },
  ];
};

const products = [
  {
    path: "/user/product",
    element: (
      <ProtectedRoute login={true}>
        <ProductIndex />
      </ProtectedRoute>
    ),
  },
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
];

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
      <ProtectedRoute login={true} role={["Customer", "Admin"]}>
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
  ...account("Customer"),
  ...account("Courier"),
  ...products,
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) => {
        return axios.get(queryKey[0] as any);
      },
    },
  },
});

const ProvidedAuth = (props: React.PropsWithChildren) => {
  const auth = useProvidedAuth();
  return (
    <AuthContext.Provider value={auth}>{props.children}</AuthContext.Provider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <Suspense fallback={<CircularProgress />}>
          <ProvidedAuth>
            <RouterProvider router={router} />
            <ToastContainer />
          </ProvidedAuth>
        </Suspense>
      </ConfirmProvider>
    </QueryClientProvider>
  );
};

export default App;
