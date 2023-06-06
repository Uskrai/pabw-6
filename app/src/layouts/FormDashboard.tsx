import React from "react";

import Typography from "@mui/material/Typography";

import AppDashboard from "@/layouts/AppDashboard";
import AppBar from "@/AppBar";

interface Props {
  title: string;
}

export default function Index(props: React.PropsWithChildren<Props>) {
  return (
    <>
      <AppBar />

      <div className="md:max-w-7xl mx-auto p-10 sm:p-6 lg:p-8 ">
        <div className="bg-white overflow-hidden shadow-xl rounded-lg p-2 md:p-4 border-gray-200 border-4 flex flex-col gap-2">
          <div className="flex justify-between">
            <Typography variant="h6">{props.title}</Typography>
          </div>

          <div className="w-full flex flex-col mr-2">{props.children}</div>
        </div>
      </div>
    </>
  );
}
