import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import { SessionProvider } from "@/contexts/SessionContext";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

// Body font - Clean sans-serif
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
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
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable}`}
    >
      <body className="antialiased overflow-hidden">
        <ErrorBoundary>
          <SessionProvider>
            {children}
            <Toaster position="top-center" toastOptions={{
              className: 'bg-background border-border text-foreground font-sans shadow-lg',
              descriptionClassName: 'text-muted-foreground'
            }} />
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
