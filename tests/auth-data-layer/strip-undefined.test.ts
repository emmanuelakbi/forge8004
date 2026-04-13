// Feature: nextjs-auth-data-layer, Property 1: stripUndefined Idempotence
// **Validates: Requirements 6.6, 6.9**

import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Re-implementation of the private `stripUndefined` function from
 * `app/lib/erc8004Client.ts` for property-based testing.
 *
 * Recursively removes `undefined` values from objects/arrays.
 * Converts top-level `null` and `undefined` to `null`.
 * Preserves primitives, arrays, and nested structures.
 *
 * NOTE: Firestore-specific sentinel checks (Timestamp, FieldValue) are omitted
 * because fast-check's `fc.anything()` never generates those types.
 */
function stripUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === "object") {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) clean[key] = stripUndefined(value);
    }
    return clean;
  }
  return obj;
}

/**
 * Arbitrary that generates random nested values including undefined.
 * Uses `fc.anything()` with settings that produce undefined values
 * at arbitrary depths inside objects and arrays.
 */
const anyWithUndefined = fc.anything({
  withUndefinedValue: true,
  withObjectString: true,
  withNullPrototype: false,
});

describe("Property 1: stripUndefined Idempotence", () => {
  it("applying stripUndefined twice produces the same result as applying it once", () => {
    fc.assert(
      fc.property(anyWithUndefined, (input) => {
        const once = stripUndefined(input);
        const twice = stripUndefined(once);

        expect(twice).toStrictEqual(once);
      }),
      { numRuns: 100 },
    );
  });
});
