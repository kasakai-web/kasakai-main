import type { Metadata } from "next";
import { fetchPublicScreenings, fetchPublicScreeningById, toScreening } from "@/utils/screening-api";
import { ScreeningDetailClient } from "@/components/screening/ScreeningDetailClient";

// Pre-generate static pages for all published events at build time.
// Falls back to on-demand ISR if the backend is unavailable during build.
export async function generateStaticParams() {
  try {
    const { events } = await fetchPublicScreenings({ limit: 200 });
    return events.map((e) => ({ id: e._id }));
  } catch {
    return [];
  }
}

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
        images: [{ url: s.image, width: 800, height: 600, alt: s.matchTitle }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: s.matchTitle,
        description: s.description,
        images: [s.image],
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
