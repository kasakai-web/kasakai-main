export interface TicketTier {
  id: string;
  name: string;
  price: number;
  description?: string;
  available?: number; // remaining seats (capacity - sold)
}

export interface ScreeningContact {
  name:  string;
  email: string;
  phone: string;
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
  contacts: ScreeningContact[];
  languages?: string[];
  isIndoor?: boolean | null;
  isSeated?: boolean | null;
  kidFriendly?: boolean | null;
  petFriendly?: boolean | null;
  minAgeEntry?: number;
  minAgePaid?: number;
  gatesOpenBefore?: number;
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
