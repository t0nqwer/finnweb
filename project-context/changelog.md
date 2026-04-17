# Changelog

## 2026-04-17

- Aligned project pricing documentation to the implemented plan tiers: Free / Basic / Business / Pro.
- Updated pricing references in product brief, decisions, and project summary files.
- Implemented centralized frontend token refresh retry flow in web API client and migrated protected pages to use it.
- Added web integration test coverage for 401 -> refresh -> retry success path (`apps/web/src/lib/api-client.test.ts`).
- Replaced auth verification/reset URL console logs with Resend-backed email service wiring in API auth module.
- Added API auth integration coverage for register, login, refresh, logout, and password reset flows in `apps/api/src/modules/auth/auth.integration.test.ts`.
- Fixed auth refresh token rotation to always produce a new token by adding a unique JWT identifier (`jti`).
- Aligned auth controller non-create POST endpoints with documented `200` responses for forgot/reset/verify/change-password flows.
