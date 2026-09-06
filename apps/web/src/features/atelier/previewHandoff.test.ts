import { describe, expect, it, vi } from "vitest";
import { emptyDraft, type Draft } from "./model";
import { samples } from "./catalogue";
import { buildPersonalizedPreviewRequest, prepareBackendDraft, runMockPersonalizedPreview } from "./previewHandoff";
const input = (): Draft => ({ ...emptyDraft, name: " Noor ", secondName: "Hidden", layout: "Infinity", gem: "Ruby" });
const options = { id: "preview-uuid", locale: "en" as const };

describe("personalized preview handoff", () => {
  it("uses customer specification, excludes inactive inputs, and freezes a detached request", () => {
    const draft = input();
    const request = buildPersonalizedPreviewRequest(draft, samples[0]!, options);
    expect(request.specification.names).toEqual(["Noor"]);
    expect(request.reference.depictedSpecification.names).toEqual(["Asma"]);
    expect(request.reference.role).toBe("illustrative-reference-only");
    expect(request.specification).not.toHaveProperty("layout");
    expect(request.specification.stones).not.toHaveProperty("gemstone");
    expect(request.specification).not.toHaveProperty("length");
    expect(request.spellingConfirmed).toBe(false);
    draft.name = "Changed";
    expect(request.specification.names).toEqual(["Noor"]);
    expect(Object.isFrozen(request.specification.names)).toBe(true);
    expect(Object.isFrozen(request.reference.depictedSpecification)).toBe(true);
  });
  it("validates customer names and categorical values before handing anything off", () => {
    expect(() => buildPersonalizedPreviewRequest({ ...input(), name: "" }, samples[0]!, options)).toThrow();
    expect(() => buildPersonalizedPreviewRequest({ ...input(), size: 99 as 22 }, samples[0]!, options)).toThrow();
    expect(() => buildPersonalizedPreviewRequest(input(), { ...samples[0]!, src: "https://remote.test/photo.png" }, options)).toThrow();
  });
  it("retains exact Arabic second names and maps only represented backend fields", () => {
    const request = buildPersonalizedPreviewRequest({ ...input(), name: "أسماء", secondName: "فاطمة", script: "Arabic", twoNames: true, lettering: "Kufi", coverage: "Accent", gem: "Ruby", metal: "White gold", chain: "Box", engraving: "Forever" }, samples[0]!, options);
    const backend = prepareBackendDraft(request);
    expect(request.specification.names).toEqual(["أسماء", "فاطمة"]);
    expect(backend.specification.names?.[1]?.approvedArabicText).toBe("فاطمة");
    expect(backend.specification).toMatchObject({ arabicStyle: "kufi", layout: "infinity", metalColor: "white", gemstone: "ruby", spellingConfirmed: false });
    expect(backend.dispatchable).toBe(false);
    expect(backend.specification.dimensions).toEqual({ widthMm: 32 });
    expect(backend.specification.chain).toEqual({ style: "box" });
    expect(backend.unresolved.map((gap) => gap.field)).toEqual(expect.arrayContaining(["construction", "dimensions", "chain", "engraving"]));
    expect(request.specification.chainStyle).toBe("Box");
  });
  it("never maps Classic Arabic to contemporary or sets reference asset/source implicitly", () => {
    const request = buildPersonalizedPreviewRequest({ ...input(), script: "Arabic", name: "أسماء" }, samples.find((sample) => sample.id === "arabic-kufi")!, options);
    const prepared = prepareBackendDraft(request);
    expect(prepared.specification).not.toHaveProperty("arabicStyle");
    expect(prepared.specification).not.toHaveProperty("referenceAsset");
    expect(prepared.specification).not.toHaveProperty("source");
    expect(prepared.unresolved.some((gap) => gap.field === "lettering")).toBe(true);
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
  });
});
