/**
 * Entry gate (§3.4 — State & permission gates).
 *
 *   Guest / not authenticated       → SCR-00 Welcome, no tab bar
 *   Authed, onboarding incomplete   → force-route to the last incomplete step
 *   Authed, onboarding complete     → SCR-10 Home, full shell
 *
 * FRONTEND STAGE: there is no auth or persistence yet, so this always lands on
 * Welcome — which is also the most useful default for reviewing the build, since
 * it walks the whole flow. When auth arrives, only the two constants below need
 * to become real reads.
 */

import { Redirect } from 'expo-router';

const IS_AUTHENTICATED = false;
const ONBOARDING_COMPLETE = false;

export default function Index() {
  if (!IS_AUTHENTICATED) return <Redirect href="/welcome" />;
  if (!ONBOARDING_COMPLETE) return <Redirect href="/onboarding/name" />;
  return <Redirect href="/(tabs)/home" />;
}
