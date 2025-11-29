import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3, Caveat } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/context/SessionContext";

// Display font - elegant serif for headings
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// Body font - warm, readable sans-serif
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

// Accent font - handwritten touches
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-accent",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mise - Kitchen Assistant",
  description: "Your personal kitchen inventory assistant with a chat-first interface",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mise",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FAF7F2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSans.variable} ${caveat.variable}`}
    >
      <body className="antialiased overflow-hidden">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
