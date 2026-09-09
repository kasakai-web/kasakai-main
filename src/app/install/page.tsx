import "../landing.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import InstallGuide from "@/components/pwa/InstallGuide";

export const metadata = {
  title: "Install the KasaKai app",
  description:
    "Add KasaKai to your home screen — your own icon, its own window, no app store and no download. Steps for Android, iPhone, iPad and desktop.",
  alternates: { canonical: "/install" },
};

/**
 * The destination for every install affordance that cannot install: the banner
 * on iOS, the footer link, and anyone who arrived from a WhatsApp webview.
 *
 * A Server Component wrapper so the page carries real metadata and its prose is
 * indexable; only the parts that depend on the device live in the client
 * component it renders.
 */
export default function InstallPage() {
  return (
    <>
      <Header />
      <main className="lp">
        <InstallGuide />
      </main>
      <Footer />
    </>
  );
}
