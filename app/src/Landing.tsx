import axios from "axios";
import React from "react";
import { Link } from "react-router-dom";
const AppBar = React.lazy(() => import("./AppBar"));
import { useUser } from "./hooks/useUser";

export default function Landing() {
  const user = useUser();

  return (
    <div className="App">
      <AppBar />
    </div>
  );
}
