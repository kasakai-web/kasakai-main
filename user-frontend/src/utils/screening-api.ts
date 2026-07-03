import { buildApiUrl, fetchWithRetry, getSession, handleAuthExpiry } from './api';
import type { Screening, TicketTier, Ticket } from '@/components/screening/types';

/* ── Raw API shapes (what the backend returns) ───────────────────────────── */

export type ApiScrTier = {
  _id: string;
  name: string;
  pricePaise: number;
  capacity: number;
  sold: number;
  description: string;
};

export type ApiScrShow = {
  _id: string;
  date: string;       // ISO date string "2026-06-01T00:00:00.000Z"
  startTime: string;  // "12:30 AM"
  endTime: string;
  status: 'active' | 'expired' | 'cancelled';
};

export type ApiScrContact = {
  name:  string;
  email: string;
  phone: string;
};

export type ApiScrEvent = {
  _id: string;
  title: string;
  description: string;
  slug: string;
  image: string;
  poster: string;
  videoUrl: string;
  venueName: string;
  location: string;
  locationUrl?: string;
  categories: string[];
  languages: string[];
  tiers: ApiScrTier[];
  shows: ApiScrShow[];
  contacts?: ApiScrContact[];
  showOrganiser?: boolean;
  status: 'published' | 'cancelled' | 'draft';
  gatesOpenBefore: number;
  isIndoor: boolean | null;
  isSeated: boolean | null;
  kidFriendly: boolean | null;
  petFriendly: boolean | null;
  minAgeEntry: number;
  minAgePaid: number;
  createdAt: string;
};

export type ScrListResponse = {
  events: ApiScrEvent[];
  total: number;
};

/* ── API fetch functions ─────────────────────────────────────────────────── */

export async function fetchPublicScreenings(params?: {
  search?: string;
  city?: string;
  page?: number;
  limit?: number;
}): Promise<ScrListResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.city && params.city !== 'All') qs.set('city', params.city);
  if (params?.page)   qs.set('page', String(params.page));
  if (params?.limit)  qs.set('limit', String(params.limit));

  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(buildApiUrl(`/screening/events${query}`));

  if (!res.ok) throw new Error('Failed to fetch screenings');
  const data = await res.json();
  return data.data as ScrListResponse;
}

export type ApiScrCarousel = {
  title: string;
  banner: string;
  poster: string;
};

export async function fetchPublicScreeningCarousels(): Promise<ApiScrCarousel[]> {
  const res = await fetch(buildApiUrl('/screening/carousels'));

  if (!res.ok) throw new Error('Failed to fetch carousel slides');
  const data = await res.json();
  return data.data as ApiScrCarousel[];
}

export async function fetchPublicScreeningById(id: string): Promise<ApiScrEvent | null> {
  const res = await fetch(buildApiUrl(`/screening/events/${id}`), {
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch event');
  const data = await res.json();
  return data.data as ApiScrEvent;
}

/* ── Booking helpers (player auth required) ──────────────────────────────── */

function playerHeaders(): Record<string, string> {
  const { token } = getSession();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type BookingOrderResponse = {
  isFree:    boolean;
  orderId?:  string;
  amount:    number;
  keyId?:    string;
  ticketId:  string;
  entryCode: string;
};

export type ConfirmedTicketResponse = {
  _id:        string;
  entryCode:  string;
  totalPaise: number;
  status:     string;
  bookedAt:   string;
};

export async function createBookingOrder(
  eventId: string,
  tierQuantities: Record<string, number>
): Promise<BookingOrderResponse> {
  const res = await fetch(buildApiUrl(`/screening/events/${eventId}/book`), {
    method:  'POST',
    headers: playerHeaders(),
    body:    JSON.stringify({ tierQuantities }),
  });
  const data = await res.json();
  if (res.status === 401) { handleAuthExpiry(); throw new Error('Session expired. Please log in again.'); }
  if (!res.ok) throw new Error(data.message || 'Failed to create booking');
  return data.data as BookingOrderResponse;
}

export async function verifyBookingPayment(params: {
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ConfirmedTicketResponse> {
  const res = await fetch(buildApiUrl('/screening/payment/verify'), {
    method:  'POST',
    headers: playerHeaders(),
    body:    JSON.stringify(params),
  });
  const data = await res.json();
  if (res.status === 401) { handleAuthExpiry(); throw new Error('Session expired. Please log in again.'); }
  if (!res.ok) throw new Error(data.message || 'Payment verification failed');
  return data.data as ConfirmedTicketResponse;
}

export type ApiMyTicket = {
  _id: string;
  event: ApiScrEvent;
  lineItems: { tierId: string; tierName: string; quantity: number; pricePaise: number }[];
  totalPaise: number;
  entryCode: string;
  status: 'confirmed' | 'used' | 'cancelled' | 'pending';
  bookedAt: string;
};

export type MyTicketsResponse = {
  confirmed: ApiMyTicket[];
  history:   ApiMyTicket[];
};

export async function fetchMyTickets(): Promise<MyTicketsResponse> {
  const res = await fetch(buildApiUrl('/screening/tickets/mine'), {
    headers: playerHeaders(),
  });
  const data = await res.json();
  if (res.status === 401) { handleAuthExpiry(); throw new Error('Session expired. Please log in again.'); }
  if (!res.ok) throw new Error(data.message || 'Failed to fetch tickets');
  return data.data as MyTicketsResponse;
}

/* ── Transform: API event → frontend Screening type ─────────────────────── */

export function toScreening(e: ApiScrEvent): Screening {
  const firstShow = (e.shows ?? [])[0];
  let date = '';
  let day = '';
  let time = '';

  if (firstShow) {
    const d = new Date(firstShow.date);
    date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); // "Jun 1"
    day  = d.toLocaleDateString('en-IN', { weekday: 'short' });               // "Mon"
    time = firstShow.startTime;                                                 // "9:00 PM"
  }

  const rawTiers = e.tiers ?? [];
  const startingPrice =
    rawTiers.length > 0
      ? Math.min(...rawTiers.map(t => Math.round(t.pricePaise / 100)))
      : 0;

  const tiers: TicketTier[] = rawTiers.map(t => ({
    id:          t._id,
    name:        t.name,
    price:       Math.round(t.pricePaise / 100),
    description: t.description || undefined,
    available:   t.capacity - t.sold,
  }));

  return {
    id:             e._id,
    matchTitle:     e.title,
    venueName:      e.venueName,
    location:       e.location,
    date,
    day,
    time,
    description:    e.description,
    startingPrice,
    tiers,
    image:          e.image || null,
    poster:         e.poster || null,
    status:         e.status === 'cancelled' ? 'cancelled' : 'published',
    contacts:       (e.contacts || []).map(c => ({ name: c.name, email: c.email, phone: c.phone })),
    showOrganiser:  e.showOrganiser ?? false,
    languages:      e.languages || [],
    isIndoor:       e.isIndoor ?? null,
    isSeated:       e.isSeated ?? null,
    kidFriendly:    e.kidFriendly ?? null,
    petFriendly:    e.petFriendly ?? null,
    minAgeEntry:    e.minAgeEntry || 0,
    minAgePaid:     e.minAgePaid || 0,
    gatesOpenBefore: e.gatesOpenBefore || 0,
    locationUrl:    e.locationUrl || undefined,
  };
}

export function toTicket(t: ApiMyTicket): Ticket {
  if (!t.event) {
    return {
      id:          t._id,
      screening:   {
        id: '', matchTitle: 'Event Unavailable', venueName: '', location: '',
        date: '', day: '', time: '', description: '', startingPrice: 0,
        tiers: [], image: null, status: 'published' as const, contacts: [],
      },
      tiers:       t.lineItems?.map(li => ({ tier: { id: String(li.tierId), name: li.tierName, price: Math.round(li.pricePaise / 100) }, quantity: li.quantity })) ?? [],
      totalAmount: Math.round(t.totalPaise / 100),
      bookingTime: new Date(t.bookedAt).toLocaleString('en-IN'),
      entryCode:   t.entryCode,
      status:      (t.status === 'used' || t.status === 'cancelled') ? t.status : 'confirmed',
    };
  }
  const screening = toScreening(t.event);
  return {
    id:          t._id,
    screening,
    tiers: (t.lineItems ?? []).map(li => ({
      tier:     { id: String(li.tierId), name: li.tierName, price: Math.round(li.pricePaise / 100) },
      quantity: li.quantity,
    })),
    totalAmount:  Math.round(t.totalPaise / 100),
    bookingTime:  new Date(t.bookedAt).toLocaleString('en-IN'),
    entryCode:    t.entryCode,
    status:       (t.status === 'used' || t.status === 'cancelled') ? t.status : 'confirmed',
  };
}
