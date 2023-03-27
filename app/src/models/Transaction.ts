export interface Transaction {
  id: string;
  user_id: string;
  merchant_id: string;
  price: string;

  status: TransactionStatus;

  products: {
    id: string;
    quantity: string;
  }[];
}

export type TransactionStatus = {
  type: "Processing";
  content: null;
};

export interface GetOrder {
  orders: Transaction[];
}
