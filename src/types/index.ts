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

export interface Event {
  id: string;
  tripId: string;
  title: string;
  type: string; // e.g., flight, hotel, poi
  startTime: string;
  endTime: string;
  latitude?: number;
  longitude?: number;
  bookingReference?: string;
  description?: string;
}

export interface Document {
  id: string;
  tripId: string;
  eventId?: string;
  name: string;
  downloadUrl: string;
}

export interface PackingItem {
  id: string;
  tripId: string;
  itemName: string;
  category: string;
  isPacked: boolean;
}
