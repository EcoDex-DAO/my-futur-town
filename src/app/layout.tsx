import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "../style.css";

export const metadata: Metadata = {
  title: "My Futur Town · Annecy",
  description: "Explorez Annecy et préparez la ville de demain avec My Futur Town.",
};

export const viewport: Viewport = { themeColor: "#102c32" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
