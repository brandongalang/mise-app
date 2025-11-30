import type { Metadata, Viewport } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { SessionProvider } from "@/contexts/SessionContext";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

// Display font - Fraunces (Soft Serif)
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
  // Removed axes to avoid conflict with static weight definition or variable font loading issues
});

// Body font - DM Sans (Geometric Sans)
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
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
  themeColor: "#FDF6E3", // Cream color
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${dmSans.variable}`}
    >
      <body className="antialiased overflow-hidden bg-cream text-charcoal">
        <ErrorBoundary>
          <SessionProvider>
            {children}
            <Toaster position="top-center" toastOptions={{
              className: 'bg-cream border-clay/20 text-charcoal font-body shadow-lg',
              descriptionClassName: 'text-warm-gray'
            }} />
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
