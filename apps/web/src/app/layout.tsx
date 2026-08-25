import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/400-italic.css";
import "./globals.css";
import { JeweloProvider } from "@/lib/jewelo-provider";
import { headers } from "next/headers";

export const metadata = {
  title: "Jewelo UI Spike",
  description: "Frontend-only Jewelo product studio prototype",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-jewelo-locale") === "ar" ? "ar" : "en";
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <JeweloProvider>{children}</JeweloProvider>
      </body>
    </html>
  );
}
