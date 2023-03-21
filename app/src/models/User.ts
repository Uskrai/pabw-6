
export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface UserForm {
  email: string;
  role: UserRole | '';
}

export type UserRole = "Customer" | "Courier" | "Admin";
