import React from "react";

import Typography from "@mui/material/Typography";

// import Link from "next/link";
import AppDashboard from "@/layouts/AppDashboard";
import Add from "@mui/icons-material/Add";

interface Props {
  title: string;
  new_title?: string;
  route: string;
}

export default function Index(props: React.PropsWithChildren<Props>) {
  return (
    <AppDashboard title={props.title}>
      <div className="p-1 md:max-w-7xl mx-auto py-10 sm:px-6 lg:px-8 ">
        <div className="bg-white overflow-hidden shadow-xl rounded-lg p-2 md:p-4 border-gray-200 border-4 flex flex-col gap-2">
          <div className="flex justify-between">
            <Typography variant="h6">{props.title}</Typography>
            <a
              id="contact"
              className="bg-blue-600 rounded p-2 focus:outline-none border-2 border-orabluenge-400 text-white"
              href={`${props.route}/create`}
            >
              <Add className="" /> {props?.new_title ?? `Tambah ${props.title} Baru`}
            </a>
          </div>

          {props.children}
        </div>
      </div>
    </AppDashboard>
  );
}
