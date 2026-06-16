# Discord is a first-class customer sign-in provider

Customers can sign in with Discord on the login page, exactly as they can with
Google and GitHub. This is distinct from, and additional to, the Discord
account *connection* on the account page described in [ADR 0004](0004-discord-pro-role-sync.md).

## Decision

Treat Discord as a first-class OAuth login provider for the customer actor.

Medusa ships built-in `google` and `github` auth providers but none for
Discord, so the backend gains a custom provider module
(`src/modules/discord-auth` in the `wcpos-medusa` repo) that extends
`AbstractAuthModuleProvider`. It is modelled on the built-in GitHub provider:
exchange the authorization code for an access token, then read the profile from
`https://discord.com/api/users/@me`. The provider requests the `identify email`
scope and is registered in `medusa-config.ts` only when `DISCORD_CLIENT_ID` is
set, the same conditional pattern as Google and GitHub.

The frontend reuses the existing generic OAuth plumbing (`/api/auth/[provider]`
and its callback). The only additions are `'discord'` in the allow-list, a
Discord brand mark, and a login button shown unconditionally alongside Google
and GitHub.

During initial rollout the button was gated behind a `DISCORD_LOGIN_ENABLED`
env flag so it could merge before the Medusa provider was deployed. Once the
provider went live the flag was removed: a transitional gate that, left in
place, only risks the button silently disappearing if the var is unset. Discord
is now a first-class provider with no special storefront configuration.

## Relationship to ADR 0004

ADR 0004 deliberately does **not** infer identity from email for the Discord
*role-sync connection*, because a customer's WCPOS email and Discord email may
differ. That decision stands for that feature and is unchanged.

Sign-in is intentionally different. Like Google and GitHub, the Discord sign-in
provider creates or links a customer **by the verified Discord email** through
Medusa's `link-or-create-customer` workflow. Choosing email parity with the
other providers — rather than ADR 0004's email-independent linking — is the
decision recorded here. The consequences:

- A user whose Discord email differs from their WCPOS email will, on sign-in,
  match or create the account belonging to the **Discord** email.
- The sign-in `discord` auth identity and the role-sync `discord_user_id`
  customer metadata are **two independent links**. The same person could sign in
  with one Discord account and connect a different one for the Pro role.
  Unifying the two is a possible future enhancement, not a requirement here.

## Guards

- The provider requires an email and **rejects unverified Discord emails**, so a
  customer is never created or linked from an address the user has not proven
  they own. This mirrors the built-in Google provider's `email_verified` check.
- The same Discord application is reused for both this sign-in flow and the
  ADR 0004 role-sync connection; they differ only in OAuth scope (`identify
  email` vs `identify`) and redirect URI.

## Deferred

- Unifying the sign-in identity and the role-sync link into one Discord linkage.
- Discord Linked Roles, already deferred by ADR 0004, remain deferred.
