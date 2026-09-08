/**
 * The identity engine's error taxonomy.
 *
 * It lives in its own module because two layers raise from it and one of them
 * is below the other: `shaping.ts` lays out the outlines and can refuse a run
 * that does not fit the canvas, while `caleums-arabic-v3.ts` builds the piece
 * on top of `shaping.ts`. Package review finding 11: the two layout refusals
 * used to be bare `Error`s, so the caller - which classifies on
 * `IdentitySolverError["code"]` to decide between a terminal block and a retry -
 * saw them as unknown failures and routed them like an infrastructure fault.
 * A shared module gives both layers the same class without a cycle.
 *
 * The customer's name is never in one of these messages. They are stored in
 * category columns (`p_error_class`, `terminal_error_code`, `p_reason`) and a
 * name has no business in one.
 */
export class IdentitySolverError extends Error {
  constructor(
    readonly code:
      | "unsupported_arabic_style"
      | "unsupported_arabic_two_name"
      | "approved_text_missing"
      | "identity_mask_empty"
      | "identity_stencil_empty_outline"
      | "identity_fit_overflow"
      | "identity_bridge_failed"
      | "identity_bridge_moved_ink"
      | "identity_carrier_no_room"
      | "identity_carrier_moved_ink"
      | "identity_recentre_too_large"
      | "identity_component_gate_failed"
      | "identity_ring_gate_failed"
      | "identity_ring_hole_too_small"
      | "identity_ring_span_too_narrow"
      | "identity_ring_tilt_too_steep"
      | "identity_ring_overhang_too_wide"
      | "identity_no_ring_seat"
      | "identity_stencil_pinhole"
      | "identity_gate_failed"
      | "identity_ring_anchor_missing"
      | "identity_ring_punched_ink"
      | "identity_ring_welded_to_glyph"
      | "identity_font_bytes_mismatch"
      | "identity_shaping_gate_failed",
    message: string = code,
  ) {
    super(message);
    this.name = "IdentitySolverError";
  }
}
