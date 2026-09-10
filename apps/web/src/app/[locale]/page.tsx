import { notFound, redirect } from "next/navigation";

/**
 * The shop has one door. `/` sends the shopper to `/en` (or `/ar`), and since
 * `e8d3dc0` that landed on an empty `<main>` - a blank screen in front of a
 * customer standing at the counter. The atelier at `/[locale]/design/new` is
 * the whole product: it already opens on the name field with the brand line
 * above it, in the shopper's language. A marketing page in front of it would
 * be one more tap between a customer and the piece they came to buy, so the
 * locale root simply forwards, keeping whichever locale the shopper arrived
 * with.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Same guard the layout applies, so an unknown locale 404s here rather than
  // being forwarded to a deeper URL that only 404s one hop later.
  if (locale !== "en" && locale !== "ar") notFound();
  redirect(`/${locale}/design/new`);
}
