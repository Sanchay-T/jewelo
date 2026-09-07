import { serve } from "inngest/next";

import { inngest } from "../../../inngest/client";
import { functions } from "../../../inngest/functions";

// A still can occupy the request for the full provider timeout (180 s) plus
// verification and the name read.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({ client: inngest, functions });
