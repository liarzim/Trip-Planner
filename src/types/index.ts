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
  baseCurrency?: string;
  exchangeRateToILS?: number;
  timeFormat?: '24h' | '12h';
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
  type: 'flight' | 'hotel' | 'waypoint';
  startTime: string;
  endTime: string;
  latitude?: number;
  longitude?: number;
  originLatitude?: number;
  originLongitude?: number;
  address?: string;
  bookingReference?: string;
  description?: string;
  flightNumber?: string;
  airline?: string;
  departureTime?: string;
  arrivalTime?: string;
  originAirport?: string;
  destinationAirport?: string;
  hotelUrl?: string;
  checkInTime?: string;
  checkOutTime?: string;
  roomType?: string;
  breakfastIncluded?: boolean;
  distance?: number;
  estimatedTravelTime?: string;
  qrCodeUrl?: string;
  routePolyline?: string;
  transportMode?: string;
  cost?: number;
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
