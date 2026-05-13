export interface TicketTier {
  id: string;
  name: string;
  price: number;
  description?: string;
  available?: number; // remaining seats (capacity - sold)
}

export interface Screening {
  id: string;
  matchTitle: string;
  venueName: string;
  location: string;
  date: string;
  day: string;
  time: string;
  description: string;
  startingPrice: number;
  tiers: TicketTier[];
  image: string | null;
  status: 'published' | 'cancelled';
}

export type BookingStep = "HOME" | "QUANTITY" | "PAYMENT" | "CONFIRMATION";
export type ViewType = "LIVE_EVENTS" | "MY_BOOKINGS" | "HISTORY";

export interface BookingData {
  screening: Screening | null;
  tierQuantities: Record<string, number>;
}

export interface Ticket {
  id: string;
  screening: Screening;
  tiers: { tier: TicketTier; quantity: number }[];
  totalAmount: number;
  bookingTime: string;
  entryCode: string;
  status: 'confirmed' | 'used' | 'cancelled';
}
