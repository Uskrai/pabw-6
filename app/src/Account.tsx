import React from "react";

const AppBar = React.lazy(() => import("./AppBar"));

export default function Account() {
  return <div>
    <AppBar />
  </div>
}
