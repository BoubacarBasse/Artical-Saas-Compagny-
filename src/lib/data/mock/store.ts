/**
 * Cookie access for the mock provider.
 *
 * Split from state.ts because this half imports `next/headers`, which is not
 * available to middleware on the Edge runtime.
 *
 * WHY A COOKIE AND NOT A MODULE-LEVEL ARRAY:
 * The end-to-end suite has to prove that user A cannot see user B's order. That
 * needs two genuinely independent users at the same time, which means two
 * browser contexts. A module-level array is shared process state — both
 * contexts would resolve to one identity and the test could not be written
 * honestly. A per-browser cookie gives real separation with no database. (It
 * also survives serverless cold starts, which will matter when deploy resumes.)
 */

import { cookies } from "next/headers";
import { MOCK_COOKIE, decodeState, encodeState, type MockState } from "./state";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function readState(): Promise<MockState | null> {
  const jar = await cookies();
  return decodeState(jar.get(MOCK_COOKIE)?.value);
}

export async function writeState(state: MockState): Promise<void> {
  const jar = await cookies();
  try {
    jar.set(MOCK_COOKIE, await encodeState(state), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: THIRTY_DAYS,
    });
  } catch (cause) {
    // Next.js forbids setting cookies while rendering a Server Component.
    // Every mutating provider call must originate from a Server Action or a
    // Route Handler. Surfacing that plainly saves a long debugging detour.
    throw new Error(
      "Mock store: cookies can only be written from a Server Action or Route " +
        "Handler, not during Server Component render. Move this provider call " +
        "into a Server Action.",
      { cause },
    );
  }
}

export async function clearState(): Promise<void> {
  const jar = await cookies();
  jar.delete(MOCK_COOKIE);
}
