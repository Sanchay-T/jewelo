/**
 * Deploy probe (`P1-2b`): proves the HarfBuzz WASM and the pinned font files
 * survive the DigitalOcean buildpack before `P1-3` renders stencils on top of
 * them.
 *
 * Everything here is *measured* at request time inside the deployed process:
 * the wasm is only reported as loaded when a shape actually succeeded, the font
 * sha comes back out of `shapeText` over the bytes it really hashed, and the
 * resolved font path is the one `identityFontUrl` produced in that build, not a
 * path this file reconstructs. No environment value is ever returned.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  identityFontUrl,
  shapeText,
  type IdentityScript,
} from "@jewelo/identity";
import { requireOperatorSession } from "../../../../../lib/backend/operator-session";

export const dynamic = "force-dynamic";

interface FontProbe {
  readonly file: string;
  readonly script: IdentityScript;
  readonly text: string;
  readonly resolvedPath: string;
  readonly pathExists: boolean;
  readonly byteLength?: number;
  readonly fontSha256Measured?: string;
  readonly glyphCount?: number;
  readonly notdefGlyphs?: number;
  readonly exactCharactersPreserved?: boolean;
  readonly upem?: number;
  readonly harfbuzzVersion?: string;
  readonly error?: string;
}

const PROBES: ReadonlyArray<{
  file: string;
  script: IdentityScript;
  text: string;
}> = [
  { file: "PlayfairDisplay-SemiBold.ttf", script: "en", text: "Asma" },
  { file: "NotoNaskhArabic-Regular.ttf", script: "ar", text: "أسماء" },
  { file: "NotoKufiArabic-Regular.ttf", script: "ar", text: "أسماء" },
];

function describe(error: unknown) {
  return error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error";
}

function resolvedWasmSpecifier() {
  // `import.meta.resolve` is the honest answer when the route runs as real ESM;
  // under a bundler it can be rewritten away, so a failure here is reported as
  // such rather than papered over with a guessed path.
  try {
    return {
      harfbuzzModuleUrl: import.meta.resolve("harfbuzzjs"),
      harfbuzzModuleUrlSource: "import.meta.resolve",
    };
  } catch (error) {
    return {
      harfbuzzModuleUrl: "harfbuzzjs",
      harfbuzzModuleUrlSource: `specifier only: ${describe(error)}`,
    };
  }
}

async function probeFont(probe: (typeof PROBES)[number]): Promise<FontProbe> {
  const url = identityFontUrl(probe.file);
  let resolvedPath: string;
  try {
    resolvedPath = fileURLToPath(url);
  } catch {
    resolvedPath = url.href;
  }
  try {
    const bytes = await readFile(resolvedPath);
    const shaped = await shapeText({
      fontBytes: new Uint8Array(bytes),
      text: probe.text,
      script: probe.script,
    });
    return {
      file: probe.file,
      script: probe.script,
      text: probe.text,
      resolvedPath,
      pathExists: true,
      byteLength: bytes.byteLength,
      fontSha256Measured: shaped.fontSha256Measured,
      glyphCount: shaped.glyphCount,
      notdefGlyphs: shaped.notdefGlyphs,
      exactCharactersPreserved: shaped.exactCharactersPreserved,
      upem: shaped.upem,
      harfbuzzVersion: shaped.harfbuzzVersion,
    };
  } catch (error) {
    return {
      file: probe.file,
      script: probe.script,
      text: probe.text,
      resolvedPath,
      pathExists: false,
      error: describe(error),
    };
  }
}

export async function GET(request: Request) {
  try {
    requireOperatorSession(request);
  } catch (error) {
    if (error instanceof Response)
      return Response.json(
        { error: error.statusText || "Request rejected", code: "unauthenticated" },
        { status: error.status, headers: { "cache-control": "no-store" } },
      );
    throw error;
  }
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return Response.json(
      { error: "Cross-site request rejected", code: "forbidden" },
      { status: 403, headers: { "cache-control": "no-store" } },
    );

  const fonts: FontProbe[] = [];
  for (const probe of PROBES) fonts.push(await probeFont(probe));
  const shapedOk = fonts.filter((font) => font.glyphCount !== undefined);

  return Response.json(
    {
      task: "P1-2b",
      ...resolvedWasmSpecifier(),
      // The only trustworthy wasm signal: HarfBuzz answered a real shape.
      wasmLoaded: shapedOk.length > 0,
      harfbuzzVersion: shapedOk[0]?.harfbuzzVersion ?? null,
      fontsProbed: fonts.length,
      fontsShaped: shapedOk.length,
      allExactCharactersPreserved:
        shapedOk.length === PROBES.length &&
        shapedOk.every((font) => font.exactCharactersPreserved === true),
      fonts,
      node: process.version,
      cwd: process.cwd(),
      nextRuntime: process.env.NEXT_RUNTIME ?? null,
      measuredAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
