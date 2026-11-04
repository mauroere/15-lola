import type { Metadata } from "next";
import "@fontsource/cinzel-decorative/latin-400.css";
import "@fontsource/pinyon-script/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/montserrat/latin-400.css";
import { event } from "@/lib/event";
import "./globals.css";
const deploymentHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
export const metadata: Metadata = {
  metadataBase: new URL(
    deploymentHost ? `https://${deploymentHost}` : "http://localhost:3030",
  ),
  title: event.date
    ? `${event.name} · Mis XV · ${event.dateShort}`
    : "Mis quince · Una noche para recordar",
  description:
    "Hay historias que merecen una noche inolvidable. Te invito a mis quince.",
  icons: { icon: "/icon.svg" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Mis quince · Una noche para recordar",
    description: "Una noche para recordar. Muy pronto, todos los detalles.",
    type: "website",
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mis quince · Una noche para recordar",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
