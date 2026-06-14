---
name: SSO (Apple + Google) auth
description: How TacFit's social sign-in coexists with email/password, and the security rule for account linking.
---

# SSO — Apple + Google

TacFit added social sign-in ALONGSIDE the original custom email/password auth
(no Replit integration fits native-mobile SSO, so it's built directly on the
existing auth). One client path for web + native iOS via
`@capgo/capacitor-social-login`. Provider returns a signed identity token; the
backend verifies it (Google via google-auth-library, Apple via Apple JWKS) and
issues the SAME session cookie + bearer token as normal login.

## Account-linking security rule (the important durable lesson)
When a returning SSO identity is not matched by provider id, link to an existing
account by email **only if the provider asserts the email is verified**, and set
a new SSO account's verified flag from the provider's own truth — never hardcode
`isEmailVerified: true`.
**Why:** linking/trusting an unverified provider email lets someone who controls
an unverified address at Google/Apple take over an existing TacFit account that
uses that email. A code review caught this as a critical flaw.
**How to apply:** any future provider or any change to find-or-create must gate
email-based linking on `emailVerified === true`; provider-id match is always safe.

## Null-password rule
`users.password` is nullable (SSO accounts have none). Every password path
(login, change-password, reset) must guard `!user.password` BEFORE calling
`.startsWith`/`bcrypt.compare`, or it 500s on SSO accounts.

## Config / availability
Client ids are PUBLIC (env vars, not secrets); buttons stay hidden until the
matching id is set. Native Google needs the iOS client id specifically (web id
alone can't drive the reversed-client-id URL scheme), so the native button gates
on `VITE_GOOGLE_IOS_CLIENT_ID`. Native Apple needs no values — only the App ID's
"Sign in with Apple" capability (audience = bundle id `com.tacfit.app`).
`VITE_` vars must be added to Codemagic too for native builds.
