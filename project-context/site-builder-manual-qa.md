# FinnWeb Site Builder MVP — Manual QA Checklist

Run against a local stack (`pnpm dev` in monorepo root) with a clean test DB unless noted.

---

## 1. Register / Login

- [ ] POST `/api/auth/register` with valid email + password → 201, receive `accessToken` + `refreshToken`
- [ ] POST `/api/auth/login` with same credentials → 200, receive tokens
- [ ] POST `/api/auth/login` with wrong password → 401
- [ ] Verify workspace is auto-created on first register (check DB or GET `/api/workspaces`)

---

## 2. Create Site

- [ ] Navigate to `/sites/create`
- [ ] Fill in business name, site name, select business type, goal, style, language
- [ ] Fill in optional phone / LINE ID / logo URL
- [ ] Leave a required field blank → continue button is disabled / shows validation error
- [ ] Enter invalid phone format → error shown, cannot continue

---

## 3. Choose Template

- [ ] Template step loads with at least one card
- [ ] Templates are filtered by the business type + goal selected in step 2
- [ ] Selecting a card highlights it
- [ ] Desktop / Mobile preview toggle switches the preview viewport
- [ ] Unselecting all templates → "Create" button is disabled on review step

---

## 4. Redirect to Builder

- [ ] Click "Create website" on review step
- [ ] API call: POST `/api/sites` with `templateId` + business answers → 201
- [ ] Browser redirects to `/sites/:siteId/builder`
- [ ] Builder shell renders with section list on the left, canvas in the centre, edit panel on the right
- [ ] At least one section is visible in the canvas (populated from template)

---

## 4A. Builder MVP Smoke

- [ ] Open `/sites/:siteId/builder` directly while authenticated
- [ ] Confirm the route renders `<BuilderShell siteId={siteId} />`
- [ ] Page selector loads the site's pages
- [ ] Section list and canvas load sections for the selected page
- [ ] Section library shows Navbar, Hero, Features, Rich text, Image, Contact form, Pricing, FAQ, Testimonials, LINE CTA, and Footer
- [ ] Click a library item -> section is created and selected immediately
- [ ] Unknown backend section type renders the canvas fallback without breaking the page
- [ ] Top bar save status shows unsaved / saving / saved while editing
- [ ] Duplicate a section -> new copy appears and is selected
- [ ] Delete a section -> it disappears and another section remains selected when available
- [ ] Publish from the builder -> success message appears
- [ ] Open the public route from the published site URL or `/s/:siteSlug`

---

## 5. Edit Section

- [ ] Click a section in the left list → section is highlighted in canvas + edit panel populates
- [ ] Change a text field (e.g. title) in the edit panel → canvas reflects the change immediately (optimistic update)
- [ ] Change an image URL field → canvas image updates

---

## 6. Autosave Section

- [ ] Make a change in the edit panel
- [ ] Wait ~1 second → save status indicator changes to "Saving…" then "Saved"
- [ ] Reload the builder → the change persists (confirmed via PATCH `/api/sites/:id/pages/:id/sections/:id`)
- [ ] Disconnect network → make a change → save status shows "Save failed"

---

## 7. Reorder Section

- [ ] Two or more sections present on a page
- [ ] Click ↑ on a section → it moves up in the list and canvas order updates
- [ ] Click ↓ on a section → it moves down
- [ ] Reload → new order persists (confirmed via POST `.../sections/reorder`)

---

## 8. Hide / Show Section

- [ ] Toggle the visibility icon on a section in the left panel → section shows a dimmed/hidden indicator in canvas
- [ ] Reload → section is still hidden
- [ ] Toggle visibility on again → section is visible in canvas
- [ ] Confirm hidden section is excluded from public render after republish (see step 14)

---

## 9. Apply Template to Existing Site

- [ ] Authenticated: POST `/api/sites/:siteId/apply-template` with a valid `templateId` → 200
- [ ] Reload builder → pages and sections reflect the new template
- [ ] Any previously published snapshot is unchanged (GET public route still returns old content until republish)
- [ ] Attempt with a siteId the user does not own → 403

---

## 10. Publish Site

- [ ] In builder, click "Publish" → POST `/api/sites/:siteId/publish` → 201
- [ ] Response includes `version: 1` on first publish
- [ ] Publish with a section containing `{{placeholder}}` text → 400 `PUBLISH_UNRESOLVED_PLACEHOLDERS_IN_SECTION`
- [ ] Fix placeholder → republish succeeds, `version` increments

---

## 11. Open `/s/:siteSlug`

- [ ] After publish: GET `/api/public/sites/:siteSlug` → 200, site + page + sections in `data`
- [ ] Navigate to `/s/:siteSlug` in browser → home page renders with sections
- [ ] Site never published → 404
- [ ] Non-existent slug → 404

---

## 12. Open `/s/:siteSlug/:pageSlug`

- [ ] Site has a published sub-page: GET `/api/public/sites/:siteSlug/pages/:pageSlug` → 200
- [ ] Navigate to `/s/:siteSlug/:pageSlug` in browser → correct sub-page renders
- [ ] Request a pageSlug that does not exist on the published snapshot → 404
- [ ] Page exists in draft but not in published snapshot → 404

---

## 13. Edit Draft After Publish — Public Site Must Not Change

- [ ] Publish site (version 1)
- [ ] Note the title rendered at `/s/:siteSlug`
- [ ] In builder, change the section title to a different value — do **not** republish
- [ ] Reload `/s/:siteSlug` → title is still the version-1 value
- [ ] Verify PATCH to the section updated the draft row but not the publish log snapshot

---

## 14. Republish — Public Site Updates

- [ ] Continuing from step 13: click "Publish" again → 201, `version: 2`
- [ ] Reload `/s/:siteSlug` → title now shows the updated value
- [ ] If a section was hidden in step 8: confirm it does not appear on the public page

---

## 15. Submit Public Lead Form

- [ ] Public page has a FORM section visible
- [ ] Submit form with valid `name` + `phone` (email optional) → 201, `submissionId` returned
- [ ] Submit with empty `name` → 400 `PUBLIC_LEAD_INVALID_NAME`
- [ ] Submit with invalid email format → 400 `PUBLIC_LEAD_INVALID_EMAIL`
- [ ] Honeypot field `_hp` filled in → API still returns normal success shape (`success: true` + data object) with 201, but no `FormSubmission` row is created
- [ ] No auth header required for any of the above requests

---

## 16. View Lead in Dashboard

- [ ] Authenticated: GET `/api/sites/:siteId/leads` → 200, lead from step 15 appears
- [ ] Lead includes `contact.name`, `contact.phone`, UTM fields, `createdAt`
- [ ] Filter by `pageId` → only leads for that page returned
- [ ] Another user's siteId → 403

---

## 17. Preview Token

- [ ] Authenticated: POST `/api/sites/:siteId/preview-token` with `{ expiresInDays: 1 }` → 201, `token` string returned
- [ ] GET `/api/public/sites/preview/:token?path=/` (site not published) → 200, returns draft content
- [ ] Token allows reading live draft sections — title updated in builder is immediately visible via preview URL
- [ ] No auth header required on the public preview endpoint
- [ ] GET `/api/sites/:siteId/preview-tokens` → lists active tokens
- [ ] POST `.../preview-tokens/:id/refresh` → `expiresAt` updates

---

## 18. Expired / Revoked Preview Token

**Expired:**

- [ ] Create token, then manually set `expiresAt` to the past in DB (or wait for natural expiry)
- [ ] GET `/api/public/sites/preview/:token?path=/` → 404 `PREVIEW_TOKEN_EXPIRED`

**Revoked:**

- [ ] Create token, then DELETE `/api/sites/:siteId/preview-tokens/:tokenId` → 200
- [ ] GET `/api/public/sites/preview/:token?path=/` → 404 `PREVIEW_TOKEN_INVALID`
- [ ] Attempt revoke with a tokenId that belongs to a different site → 404 or 403

---

## Notes

- All public endpoints (`/api/public/*`, `/s/*`) must work without an `Authorization` header.
- All authenticated endpoints must return 401 when the header is missing and 403 when the user lacks access.
- After any test that publishes, verify the publish log row exists in the DB with a non-null `snapshot`.
