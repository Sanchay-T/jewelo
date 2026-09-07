import { describe, expect, it, vi } from "vitest";
import { emptyDraft, type Draft } from "./model";
import { samples } from "./catalogue";
import {
  approvedSpecification,
  backendDraftBody,
  backendSpecification,
  buildPersonalizedPreviewRequest,
  previewRequestBody,
  runMockPersonalizedPreview,
} from "./previewHandoff";
const input = (): Draft => ({ ...emptyDraft, name: " Noor ", secondName: "Hidden", layout: "Infinity", gem: "Ruby" });
const options = { id: "preview-uuid", locale: "en" as const };

describe("personalized preview handoff", () => {
  it("uses customer specification, excludes inactive inputs, and freezes a detached request", () => {
    const draft = input();
    const request = buildPersonalizedPreviewRequest(draft, samples[0]!, options);
    expect(request.specification.names).toEqual(["Noor"]);
    expect(request.reference?.depictedSpecification.names).toEqual(["Asma"]);
    expect(request.reference?.role).toBe("illustrative-reference-only");
    expect(request.specification).not.toHaveProperty("layout");
    expect(request.specification.stones).not.toHaveProperty("gemstone");
    expect(request.specification).not.toHaveProperty("length");
    expect(request.spellingConfirmed).toBe(false);
    draft.name = "Changed";
    expect(request.specification.names).toEqual(["Noor"]);
    expect(Object.isFrozen(request.specification.names)).toBe(true);
    expect(Object.isFrozen(request.reference!.depictedSpecification)).toBe(true);
  });
  it("validates customer names and categorical values before handing anything off", () => {
    expect(() => buildPersonalizedPreviewRequest({ ...input(), name: "" }, samples[0]!, options)).toThrow();
    expect(() => buildPersonalizedPreviewRequest({ ...input(), size: 99 as 22 }, samples[0]!, options)).toThrow();
    expect(() => buildPersonalizedPreviewRequest(input(), { ...samples[0]!, src: "https://remote.test/photo.png" }, options)).toThrow();
    // A combination with no continuous family still previews the customer's own
    // specification; it simply carries no illustrated reference.
    const withoutSample = buildPersonalizedPreviewRequest(input(), undefined, options);
    expect(withoutSample.reference).toBeUndefined();
    expect(withoutSample.specification.names).toEqual(["Noor"]);
  });
  it("retains exact Arabic second names and maps the complete backend specification", () => {
    const request = buildPersonalizedPreviewRequest({ ...input(), name: "أسماء", secondName: "فاطمة", script: "Arabic", twoNames: true, lettering: "Kufi", coverage: "Accent", gem: "Ruby", metal: "White gold", chain: "Box", engraving: "Forever" }, samples[0]!, options);
    const backend = backendSpecification(request);
    expect(request.specification.names).toEqual(["أسماء", "فاطمة"]);
    expect(backend.names[1]?.approvedArabicText).toBe("فاطمة");
    expect(backend.names[1]?.approvedEnglishText).toBeNull();
    expect(backend).toMatchObject({
      arabicStyle: "kufi", lettering: "kufi", layout: "infinity", connector: "infinity",
      metalColor: "white", gemstone: "ruby", stoneCoverage: "accent", complexity: 2,
      finish: "polished", source: "fresh", origin: "caleums-atelier", sizeProfile: "classic",
    });
    expect(backend.dimensions).toEqual({ widthMm: 32, heightMm: 18, thicknessMm: 1.2 });
    expect(backend.chain).toEqual({ style: "box", lengthCm: 45 });
    // Engraving has no backend column; it is labelled inside the bench notes.
    expect(backend.notes).toContain("Engraving: Forever");
    expect(request.specification.chainStyle).toBe("Box");
  });
  it("leaves no field of the backend draft unresolved", () => {
    const backend = backendSpecification(buildPersonalizedPreviewRequest(input(), samples[0]!, options));
    for (const field of ["jewelryType", "nameCount", "names", "arabicStyle", "layout", "source", "metalKarat",
      "metalColor", "finish", "stoneCoverage", "gemstone", "connector", "sizeProfile", "dimensions", "chain",
      "complexity", "construction", "lettering", "origin"] as const)
      expect(backend[field], field).toBeDefined();
    expect(backend.spellingConfirmed).toBeUndefined();
    expect(backendDraftBody(buildPersonalizedPreviewRequest(input(), samples[0]!, options))).toMatchObject({ locale: "en" });
  });
  it("maps a single English name to no connector, no Arabic style and the delicate profile at 22 mm", () => {
    const backend = backendSpecification(buildPersonalizedPreviewRequest({ ...input(), size: 22, coverage: "Full pavé", gem: "Emerald" }, samples[0]!, options));
    expect(backend).toMatchObject({ arabicStyle: "none", lettering: "classic", layout: "single-name",
      connector: "none", nameCount: 1, sizeProfile: "delicate", complexity: 4, gemstone: "emerald" });
    expect(backend.dimensions).toEqual({ widthMm: 22, heightMm: 12, thicknessMm: 1.2 });
  });
  it("sends Arabic Classic as the certified contemporary alias so the run is Arabic and the spelling is the customer's", () => {
    // contemporary is the frozen UI alias for the certified `classic` engine, and
    // the approval RPC reads a non-none arabicStyle as "this run is Arabic".
    const backend = backendSpecification(buildPersonalizedPreviewRequest({ ...input(), script: "Arabic", name: "أسماء" }, samples.find((sample) => sample.id === "arabic-kufi")!, options));
    expect(backend.arabicStyle).toBe("contemporary");
    expect(backend.lettering).toBe("classic");
    expect(backend.names[0]).toEqual({ approvedEnglishText: null, approvedArabicText: "أسماء" });
    expect(backend).not.toHaveProperty("referenceAsset");
  });
  it("refuses to approve a revision the customer has not confirmed", () => {
    const request = buildPersonalizedPreviewRequest(input(), samples[0]!, options);
    expect(() => approvedSpecification(request, false)).toThrow();
    expect(approvedSpecification(request, true).spellingConfirmed).toBe(true);
  });
  it("captures the shown sample and the customer contact for the honest-degrade request", () => {
    const request = buildPersonalizedPreviewRequest(input(), samples[0]!, options);
    const body = previewRequestBody({ request, contact: { channel: "whatsapp", value: "+971 50 123 4567", name: " Noor " },
      requestKey: "11111111-2222-4333-8444-555555555555", manifestId: "sample-assets", sampleShown: true, generationRunId: "run-id" });
    expect(body.specification.names).toEqual(["Noor"]);
    expect(body.contact).toEqual({ channel: "whatsapp", value: "+971 50 123 4567", name: "Noor" });
    expect(body.sampleReference).toMatchObject({ role: "illustrative-reference-only", sampleId: samples[0]!.id, assetPath: samples[0]!.src });
    expect(previewRequestBody({ request: buildPersonalizedPreviewRequest(input(), undefined, options), contact: { channel: "email", value: "a@b.test" }, requestKey: "k", manifestId: "m", sampleShown: true })).not.toHaveProperty("sampleReference");
    expect(body.requestKey).toBe("11111111-2222-4333-8444-555555555555");
    expect(body.generationRunId).toBe("run-id");
    // A shopper who never saw a labelled sample must not have one recorded.
    expect(previewRequestBody({ request, contact: { channel: "email", value: "a@b.test" }, requestKey: "k", manifestId: "m", sampleShown: false })).not.toHaveProperty("sampleReference");
  });
  it("the mock adapter retains the request and partial errors without claiming personalized imagery", async () => {
    const request = buildPersonalizedPreviewRequest(input(), samples[0]!, options);
    const capture = { key: "local-reference", views: {}, errors: { Dark: "Failed" } };
    const captureReferences = vi.fn(async () => capture);
    const result = await runMockPersonalizedPreview(request, captureReferences);
    expect(captureReferences).toHaveBeenCalledOnce();
    expect(result.mode).toBe("mock");
    expect(result.personalized).toBe(false);
    expect(result.request).toBe(request);
    expect(result.referenceCapture).toBe(capture);
    expect(result.backendPreparation.origin).toBe("caleums-atelier");
  });
});
