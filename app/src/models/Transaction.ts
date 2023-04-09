export interface Transaction {
  id: string;
  user_id: string;
  merchant_id: string;
  price: string;

  status: TransactionStatus[];

  products: {
    id: string;
    quantity: string;
  }[];
}

export type TransactionStatusType =
  | {
      type: "Processing";
    }
  | { type: "WaitingForCourier" };

export interface TransactionStatus {
  type: TransactionStatusType;
  date: string;
}

export interface GetOrder {
  orders: Transaction[];
}

export interface GetTransaction {
  transactions: Transaction[];
}

export function statusToString(status?: TransactionStatus): string {
  if (status?.type.type == "Processing") {
    return "Processing";
  } else if (status?.type.type == "WaitingForCourier") {
    return "Waiting for Courier";
  } else {
    return "";
  }
}
