import CircularProgress from "@mui/material/CircularProgress";
import React, { Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./App.css";
const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
    children: [],
  },
]);

const App = () => {
  const auth = useProvidedAuth();

  return (
    <Suspense fallback={<CircularProgress />}>
        <RouterProvider router={router} />
    </Suspense>
  );
};

export default App;
