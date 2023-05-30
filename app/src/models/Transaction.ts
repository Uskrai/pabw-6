export interface Transaction {
  id: string;
  user_id: string;
  merchant_id: string;
  price: string;
  courier_id?: string;

  status: TransactionStatus[];

  products: {
    id: string;
    quantity: string;
  }[];
}

export type TransactionStatusType =
  | { type: "WaitingForMerchantConfirmation" }
  | { type: "ProcessingInMerchant" }
  | { type: "WaitingForCourier" }
  | { type: "PickedUpByCourier" }
  | { type: "SendBackToMerchant" }
  | { type: "WaitingForMerchantWhenSendBack" }
  | { type: "ArrivedInMerchant" }
  | { type: "ArrivedInDestination" };

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
  const type = status?.type?.type;
  if (type == "ProcessingInMerchant") {
    return "Processing";
  } else if (type == "WaitingForCourier") {
    return "Waiting for Courier";
  } else if (type == "PickedUpByCourier") {
    return "Picked Up By Courier";
  } else if (type == "ArrivedInDestination") {
    return "Arrived in Destination";
  } else if (type == "SendBackToMerchant"){
    return "Sending Back to Merchant";
  } else if (type == "WaitingForMerchantWhenSendBack") {
    return "Waiting for Merchant";
  } else if (type == "ArrivedInMerchant") {
    return "Arrived In Merchant";
  } else {
    return type || "";
  }
}

export interface Delivery {
  id: string;
  user_id: string;
  merchant_id: string;
  courier_id?: string;
  price: string;

  status: TransactionStatus[];
}

export interface GetDelivery {
  deliveries: Delivery[];
}
