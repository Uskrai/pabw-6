import React from "react";

import Typography from "@mui/material/Typography";

import ExitToApp from "@mui/icons-material/ExitToApp";
import AppDashboard from "@/layouts/AppDashboard";
import AppBar from "@/AppBar";
// import Link from "@mui/material/Link";
// import Add from "@mui/icons-material/Add";
// import FormControl from "@mui/material/FormControl";

interface Props {
  title: string;
  route: string;
}

export default function Index(props: React.PropsWithChildren<Props>) {
  return (
    <>
      <AppBar />
      <div className="pb-12 mx-0 md:mx-20">
        <div className="mx-auto">
          <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg">
            <div className="flex p-5 gap-3 flex-col-reverse md:flex-row-reverse ">
              {/* {permissions.canDeleteMarket && ( */}
              {/*   <form onSubmit={onDelete}> */}
              {/*     <JetDangerButton */}
              {/*       type="submit" */}
              {/*       className="bg-red-600 rounded p-2 focus:outline-none border-2 border-red-400 text-white" */}
              {/*     > */}
              {/*       <Delete /> {market.deleted_at ? 'Force Delete' : 'Delete'} */}
              {/*     </JetDangerButton> */}
              {/*   </form> */}
              {/* )} */}
              {/* {permissions.canUpdateMarket && ( */}
              {/*   <Link */}
              {/*     href={ */}
              {/*       market.deleted_at ? */}
              {/*         route('market.restore', market.id) : */}
              {/*         route('market.edit', market.id) */}
              {/*     } */}
              {/*     className="bg-yellow-600 rounded p-2 focus:outline-none border-2 border-orange-400 text-white" */}
              {/*   > */}
              {/*     <Edit /> {market.deleted_at ? 'Restore' : 'Edit'} */}
              {/*   </Link> */}
              {/* )} */}
              <a
                href={props.route}
                className="bg-blue-600 rounded p-2 focus:outline-none border-2 border-blue-400 text-white"
              >
                <ExitToApp /> Kembali
              </a>

              <div className="flex justify-between p-2 grow">
                <Typography variant="h6">{props.title}</Typography>
              </div>
            </div>
            <div className="p-2">{props.children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
