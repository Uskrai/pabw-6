export interface Product {
  id: string;
  user_id: string;

  name: string;
  description: string;
  price: string;
  stock: string;
  updated_at: string;
  deleted_at: string;
}

export interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
}

export interface GetProduct {
  products: Product[];
}
