import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Topkapı Okulları · SEO/GEO İçerik Motoru",
  description: "Topkapı Okulları için SEO ve GEO odaklı eğitim makaleleri üretim paneli."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
