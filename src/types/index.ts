export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string; // User ID
}

export interface Trip {
  id: string;
  groupId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface Expense {
  id: string;
  tripId: string;
  groupId: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  description: string;
}
