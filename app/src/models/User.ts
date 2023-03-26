
export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface UserForm {
  email: string;
  role: UserRole | '';
  password: string;
  confirm_password: string;
}

export type UserRole = "Customer" | "Courier" | "Admin";
