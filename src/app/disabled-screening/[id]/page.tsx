import type { Metadata } from "next";
import { fetchPublicScreeningById, toScreening } from "@/utils/screening-api";
import { ScreeningDetailClient } from "@/components/screening/ScreeningDetailClient";

// Always render fresh — never serve from a stale static/ISR cache.
// Without this, Next.js can cache a null result (from when the event was
// draft or the backend was briefly unreachable) and keep serving 404.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const raw = await fetchPublicScreeningById(id);
    if (!raw) return { title: "Event Not Found — Kasa Kai Screening" };
    const s = toScreening(raw);
    return {
      title: `${s.matchTitle} | Kasa Kai Screening`,
      description: s.description,
      openGraph: {
        title: s.matchTitle,
        description: s.description,
        ...(s.image ? { images: [{ url: s.image, width: 800, height: 600, alt: s.matchTitle }] } : {}),
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: s.matchTitle,
        description: s.description,
        ...(s.image ? { images: [s.image] } : {}),
      },
    };
  } catch {
    return { title: "Kasa Kai Screening" };
  }
}

export default async function ScreeningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const raw = await fetchPublicScreeningById(id);
    const screening = raw ? toScreening(raw) : null;
    return <ScreeningDetailClient screening={screening} />;
  } catch {
    return <ScreeningDetailClient screening={null} />;
  }
}
