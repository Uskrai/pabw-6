import * as React from "react";
import { styled, createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import MuiDrawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Link from "@mui/material/Link";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import NotificationsIcon from "@mui/icons-material/Notifications";

import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import HomeIcon from "@mui/icons-material/Home";
import ListSubheader from "@mui/material/ListSubheader";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PeopleIcon from "@mui/icons-material/People";
import BarChartIcon from "@mui/icons-material/BarChart";
import LayersIcon from "@mui/icons-material/Layers";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/hooks/useAuth";
// import Head from "next/head";

function Copyright(props: any) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      {...props}
    >
      {"Copyright © "}
      <Link color="inherit" href="https://mui.com/">
        Your Website
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

const drawerWidth: number = 240;

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  "& .MuiDrawer-paper": {
    position: "relative",
    whiteSpace: "nowrap",
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    boxSizing: "border-box",
    ...(!open && {
      overflowX: "hidden",
      transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
      width: theme.spacing(7),
      [theme.breakpoints.up("sm")]: {
        width: theme.spacing(9),
      },
    }),
  },
}));

const mdTheme = createTheme();

interface Props {
  title: string;
}

export default function AppDashboard(props: React.PropsWithChildren<Props>) {
  const [open, setOpen] = React.useState(true);
  const toggleDrawer = () => {
    setOpen(!open);
  };
  const user = useUser();
  const auth = useAuth();

  const mainListItems = (
    <React.Fragment>
      <Link href="/">
        <ListItemButton>
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="Home" />
        </ListItemButton>
      </Link>
      <Link href="/user/order">
        <ListItemButton>
          <ListItemIcon>
            <ShoppingCartIcon />
          </ListItemIcon>
          <ListItemText primary="Order" />
        </ListItemButton>
      </Link>
      <Link href="/user/transaction">
        <ListItemButton>
          <ListItemIcon>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText primary="Transaction" />
        </ListItemButton>
      </Link>
      {/* <ListItemButton> */}
      {/*   <ListItemIcon> */}
      {/*     <PeopleIcon /> */}
      {/*   </ListItemIcon> */}
      {/*   <ListItemText primary="Customers" /> */}
      {/* </ListItemButton> */}
      {/* <ListItemButton> */}
      {/*   <ListItemIcon> */}
      {/*     <BarChartIcon /> */}
      {/*   </ListItemIcon> */}
      {/*   <ListItemText primary="Reports" /> */}
      {/* </ListItemButton> */}
      {/* <ListItemButton> */}
      {/*   <ListItemIcon> */}
      {/*     <LayersIcon /> */}
      {/*   </ListItemIcon> */}
      {/*   <ListItemText primary="Integrations" /> */}
      {/* </ListItemButton> */}
    </React.Fragment>
  );

  const secondaryListItems = (
    <React.Fragment>
      {/* <ListSubheader component="div" inset> */}
      {/*   Saved reports */}
      {/* </ListSubheader> */}
      {/* <ListItemButton> */}
      {/*   <ListItemIcon> */}
      {/*     <AssignmentIcon /> */}
      {/*   </ListItemIcon> */}
      {/*   <ListItemText primary="Current month" /> */}
      {/* </ListItemButton> */}
      {/* <ListItemButton> */}
      {/*   <ListItemIcon> */}
      {/*     <AssignmentIcon /> */}
      {/*   </ListItemIcon> */}
      {/*   <ListItemText primary="Last quarter" /> */}
      {/* </ListItemButton> */}
      {/* <ListItemButton> */}
      {/*   <ListItemIcon> */}
      {/*     <AssignmentIcon /> */}
      {/*   </ListItemIcon> */}
      {/*   <ListItemText primary="Year-end sale" /> */}
      {/* </ListItemButton> */}
    </React.Fragment>
  );

  return (
    <ThemeProvider theme={mdTheme}>
      {/* <Head> */}
      {/*   <title>{props.title}</title> */}
      {/* </Head> */}

      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar position="absolute" open={open}>
          <Toolbar
            sx={{
              pr: "24px", // keep right padding when drawer closed
            }}
          >
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={toggleDrawer}
              sx={{
                marginRight: "36px",
                ...(open && { display: "none" }),
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              component="h1"
              variant="h6"
              color="inherit"
              noWrap
              sx={{ flexGrow: 1 }}
            >
              {props.title}
            </Typography>
            <IconButton color="inherit">
              {/* <Badge badgeContent={4} color="secondary"> */}
              {/*   <NotificationsIcon /> */}
              {/* </Badge> */}
            </IconButton>
          </Toolbar>
        </AppBar>
        <Drawer variant="permanent" open={open}>
          <Toolbar
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              px: [1],
            }}
          >
            <IconButton onClick={toggleDrawer}>
              <ChevronLeftIcon />
            </IconButton>
          </Toolbar>
          <Divider />
          <List component="nav">
            {mainListItems}
            <Divider sx={{ my: 1 }} />
            {secondaryListItems}
          </List>
        </Drawer>
        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === "light"
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: "100vh",
            overflow: "auto",
          }}
        >
          <Toolbar />

          {props.children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
