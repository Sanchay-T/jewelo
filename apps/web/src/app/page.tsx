import { redirect } from "next/navigation";

// One hop to the studio. The locale root redirects to the atelier itself, so
// sending `/` to `/en` first cost a second round trip for nothing.
export default function RootPage() {
  redirect("/en/design/new");
}
