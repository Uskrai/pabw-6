import AccountCircle from "@mui/icons-material/AccountCircle";
import AdbIcon from "@mui/icons-material/Adb";
import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import axios from "axios";
import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useUser } from "./hooks/useUser";
import { currencyFormatter } from "./utils/formatter";

export default function ResponsiveAppBar() {
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(
    null
  );
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );

  const user = useUser();
  const auth = useAuth();
  const navigate = useNavigate();

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);

    // const settings = ["Profile", "Account", "Dashboard", "Logout"];
  };

  const pages = Object.entries({
    Delivery: user?.user?.role == "Courier" ? "/courier/delivery" : null,
    Customer: user?.user?.role == "Admin" ? "/admin/account/customer" : null,
    Courier: user?.user?.role == "Admin" ? "/admin/account/courier" : null,
    Products: ["Admin", "Customer"].includes(user?.user?.role || "")
      ? "/user/product"
      : null,
    Order: ["Customer", "Admin"].includes(user?.user?.role ?? "")
      ? "/user/order"
      : null,
    Sale: ["Customer", "Admin"].includes(user?.user?.role ?? "")
      ? "/user/transaction"
      : null,
    Cart: ["Customer", "Admin"].includes(user?.user?.role ?? "")
      ? "/user/cart"
      : null,
    // Accounts: user.user?.role == "Admin" ? "/admin/account" : null,
  }).filter(([_, it]) => it != null);

  const settings = user.user
    ? {
        Logout: async () => {
          await axios.post("/api/v1/auth/logout");
          auth.logout();
          navigate("/");
          handleCloseUserMenu();
        },
      }
    : null;

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <AdbIcon sx={{ display: { xs: "none", md: "flex" }, mr: 1 }} />
          <NavLink to="/">
            <Typography
              variant="h6"
              noWrap
              sx={{
                mr: 2,
                display: { xs: "none", md: "flex" },
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".3rem",
                color: "white",
                textDecoration: "none",
              }}
            >
              LOGO
            </Typography>
          </NavLink>

          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Drawer open={Boolean(anchorElNav)} onClose={handleCloseNavMenu}>
              {/* <Menu */}
              {/*   id="menu-appbar" */}
              {/*   anchorEl={anchorElNav} */}
              {/*   anchorOrigin={{ */}
              {/*     vertical: "bottom", */}
              {/*     horizontal: "left", */}
              {/*   }} */}
              {/*   keepMounted */}
              {/*   transformOrigin={{ */}
              {/*     vertical: "top", */}
              {/*     horizontal: "left", */}
              {/*   }} */}
              {/*   open={Boolean(anchorElNav)} */}
              {/*   onClose={handleCloseNavMenu} */}
              {/*   sx={{ */}
              {/*     display: { xs: "block", md: "none" }, */}
              {/*   }} */}
              {/* > */}
              {pages.map(([page, link]) => (
                <MenuItem key={page} onClick={handleCloseNavMenu}>
                  <NavLink to={link!}>
                    <Typography textAlign="center">{page}</Typography>
                  </NavLink>
                </MenuItem>
              ))}
              {/* </Menu> */}
            </Drawer>
          </Box>
          <AdbIcon sx={{ display: { xs: "flex", md: "none" }, mr: 1 }} />
          <Typography
            variant="h5"
            noWrap
            component="a"
            href=""
            sx={{
              mr: 2,
              display: { xs: "flex", md: "none" },
              flexGrow: 1,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            LOGO
          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
            {pages.map(([page, link]) => (
              <NavLink
                key={page}
                to={link!}
                onClick={handleCloseNavMenu}
                style={{ margin: "4px", color: "white" }}
                // style={{ my: 2, color: "white", display: "block" }}
              >
                <Typography>{page}</Typography>
              </NavLink>
            ))}
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            {user.isLoading ? (
              <>
                <CircularProgress sx={{ color: "white" }} />
              </>
            ) : settings ? (
              <>
                <Typography component="a" sx={{ m: 4, color: "white" }}>
                  {currencyFormatter.format(user?.user?.balance || ("" as any))}
                </Typography>

                <Tooltip title="Open settings">
                  <IconButton onClick={handleOpenUserMenu} sx={{ m: 2 }}>
                    {user?.user?.email}
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ mt: "45px" }}
                  id="menu-appbar"
                  anchorEl={anchorElUser}
                  anchorOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  open={Boolean(anchorElUser)}
                  onClose={handleCloseUserMenu}
                >
                  {Object.entries(settings).map(([setting, value]) => (
                    <MenuItem key={setting} onClick={value}>
                      <Typography textAlign="center">{setting}</Typography>
                    </MenuItem>
                  ))}
                </Menu>
              </>
            ) : (
              <NavLink to="/login">
                <Typography textAlign="center" sx={{ color: "white" }}>
                  Login
                </Typography>
              </NavLink>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
