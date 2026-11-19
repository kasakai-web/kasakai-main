import Home from "./HomeClient";

// A server wrapper only so the landing page can carry its own canonical; the
// page itself is a client component and cannot export metadata. The canonical
// is not set in the root layout because every page without its own would then
// inherit "/" and tell Google it is a copy of the home page.
export const metadata = {
  alternates: { canonical: "/" },
};

export default Home;
