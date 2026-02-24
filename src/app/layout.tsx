import type { Metadata, Viewport } from "next";
import { playfairDisplay, inter, jetbrainsMono, notoNaskhArabic } from "./fonts";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jewelo — Design Your Jewelry",
  description: "AI-powered custom jewelry design. Made real in 48 hours.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jewelo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF7F2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${playfairDisplay.variable} ${inter.variable} ${jetbrainsMono.variable} ${notoNaskhArabic.variable} font-body antialiased bg-cream text-text-primary`}
      >
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
