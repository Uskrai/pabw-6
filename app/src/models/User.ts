
export interface User {
  id: string;
  email: string;
  role: UserRole;
  balance: string;
}

export interface UserForm {
  email: string;
  role: UserRole | '';
  password: string;
  confirm_password: string;
  balance: string;
}

export type UserRole = "Customer" | "Courier" | "Admin";
