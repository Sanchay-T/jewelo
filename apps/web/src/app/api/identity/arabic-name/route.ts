import {
  MockArabicNameConverter,
  OpenAIArabicNameConverter,
  type ArabicNameConverter,
} from "@jewelo/ai";
import {
  authenticatedUser,
  jsonError,
} from "../../../../lib/backend/supabase-rest";

// The single sanctioned gpt-5.6-luna call in Jewelo. It proposes an Arabic
// spelling; the customer confirms it before any revision is frozen. Nothing
// downstream trusts this value until spelling confirmation.
function converter(): ArabicNameConverter {
  const apiKey = process.env.OPENAI_API_KEY;
  if (process.env.PROVIDER_MODE !== "real" || !apiKey)
    return new MockArabicNameConverter();
  return new OpenAIArabicNameConverter(
    apiKey,
    process.env.OPENAI_NAME_MODEL ?? "gpt-5.6-luna",
  );
}

export async function POST(request: Request) {
  try {
    await authenticatedUser(request);
    const { englishName } = (await request.json()) as { englishName: string };
    const suggestion = await converter().suggest(String(englishName ?? ""));
    return Response.json(suggestion, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
