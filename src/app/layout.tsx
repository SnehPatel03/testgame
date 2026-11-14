import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/game/ServiceWorkerRegister";
import { CustomCursor } from "@/components/game/CustomCursor";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: "Mafia — No Host Needed",
  description:
    "A real-time, host-free Mafia party game. Every player uses their own phone — synchronized nights, hidden roles, in-person voting.",
  keywords: ["mafia", "party game", "multiplayer", "real-time", "no host"],
  authors: [{ name: "Mafia — No Host Needed" }],
  applicationName: "Mafia",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mafia",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/logo.svg"],
  },
  openGraph: {
    title: "Mafia — No Host Needed",
    description:
      "A real-time, host-free Mafia party game. Every player uses their own phone.",
    type: "website",
    siteName: "Mafia — No Host Needed",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mafia — No Host Needed",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mafia — No Host Needed",
    description:
      "A real-time, host-free Mafia party game. Every player uses their own phone.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0506",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <CustomCursor />
        <ServiceWorkerRegister />
        {children}
        <Sonner
          position="top-center"
          theme="dark"
          toastOptions={{
            style: {
              background: "oklch(0.18 0.02 18)",
              color: "oklch(0.95 0.012 20)",
              border: "1px solid rgba(198, 40, 40, 0.4)",
              boxShadow: "0 8px 32px -8px rgba(198, 40, 40, 0.35)",
            },
          }}
        />
      </body>
    </html>
  );
}
