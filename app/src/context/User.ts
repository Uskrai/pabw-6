import React from "react";
import { Auth } from "../hooks/useAuth";

export const AuthContext = React.createContext<Auth | null>(null);
