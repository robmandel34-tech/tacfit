// Accounts that skip email verification at sign-up and sign-in.
//
//  - @test.com / @tacfit.app: dev/test users (legacy; the two original App Store
//    reviewer accounts live on @tacfit.app).
//  - APP_REVIEWER_EMAIL: the current App Store review demo account. It is an
//    exact-match exemption on purpose — the joinmuster.com domain must NOT be
//    exempt as a whole, or anyone could register a joinmuster.com address and
//    bypass verification.
export const APP_REVIEWER_EMAIL = "appreview@joinmuster.com";

export function isVerificationExemptEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith("@test.com") ||
    normalized.endsWith("@tacfit.app") ||
    normalized === APP_REVIEWER_EMAIL
  );
}
