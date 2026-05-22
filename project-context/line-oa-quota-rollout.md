# LINE OA Quota Rollout

## Status

Implemented on 2026-05-22.

FinnWeb now has a dedicated LINE OA delivery path:

- Public lead submission creates `FormSubmission` first and keeps the existing success response shape.
- LINE OA delivery runs through `LineOaNotificationService.sendLeadNotificationForSubmission()`.
- Async delivery uses BullMQ queue `line-oa` with job name `line-oa.lead.notification`.
- Delivery status is recorded in `LineOaDelivery`.

## Current Enforcement Model

- `Plan.lineOaMonthlyQuota = null` means unlimited LINE OA sends for BUSINESS/PRO.
- FREE/BASIC quotas are enforced at send time, not submit time.
- When quota is full, FinnWeb does not call LINE. It records:
  - `LineOaDelivery.status = SKIPPED`
  - `LineOaDelivery.reasonCode = LINE_OA_QUOTA_REACHED`
  - Thai `customerMessage`
- The lead submission still succeeds and remains visible to the owner.

## Usage Source

Monthly LINE OA usage is now counted from successful sends only:

```sql
SELECT s."workspaceId", COUNT(*) AS line_oa_monthly_sent
FROM "LineOaDelivery" d
JOIN "Form" f ON f."id" = d."formId"
JOIN "Site" s ON s."id" = f."siteId"
WHERE d."status" = 'SENT'
  AND d."sentAt" >= date_trunc('month', now())
  AND d."sentAt" < date_trunc('month', now()) + interval '1 month'
GROUP BY s."workspaceId"
ORDER BY line_oa_monthly_sent DESC;
```

Notes:

- `SKIPPED`, `FAILED`, and `FALLBACK_SENT` do not count as LINE OA usage.
- Owner-visible usage in `/billing/plan-usage` may decrease versus the old telemetry because the old counter counted submissions on token-enabled forms, while the new counter counts actual successful LINE sends.

## Delivery Validation

Use these spot checks after deploy:

```sql
-- Recent delivery outcomes
SELECT d."status", d."reasonCode", COUNT(*) AS total
FROM "LineOaDelivery" d
WHERE d."createdAt" >= now() - interval '24 hours'
GROUP BY d."status", d."reasonCode"
ORDER BY total DESC;
```

```sql
-- FREE/BASIC quota skips should preserve successful submissions
SELECT fs."id" AS submission_id, d."status", d."reasonCode", fs."createdAt"
FROM "FormSubmission" fs
JOIN "LineOaDelivery" d ON d."formSubmissionId" = fs."id"
WHERE d."reasonCode" = 'LINE_OA_QUOTA_REACHED'
ORDER BY fs."createdAt" DESC
LIMIT 20;
```

```sql
-- Fallback email should not inflate LINE usage
SELECT COUNT(*) AS fallback_sent_this_month
FROM "LineOaDelivery"
WHERE "status" = 'FALLBACK_SENT'
  AND "sentAt" >= date_trunc('month', now())
  AND "sentAt" < date_trunc('month', now()) + interval '1 month';
```

## Manual Verification With Real LINE OA

1. In LINE Developers Console, create or open the Messaging API channel for the owner OA.
2. Copy Channel access token and Channel secret into the FinnWeb form settings storage.
3. Run the bot info verification path (`GET https://api.line.me/v2/bot/info` through `discoverBotInfoForForm`) and confirm `Form.lineOaBotUserId` is set and `lineOaSetupStatus = VERIFIED`.
4. Set webhook URL in LINE Developers Console:
   `https://api.finnweb.site/api/line-oa/webhook`
5. Turn on webhook usage in LINE Developers Console.
6. Add the LINE OA as a friend from the owner account.
7. Confirm the LINE webhook receives a `follow` event and stores `Form.lineOaRecipientId`.
8. Submit the public FinnWeb form.
9. Confirm the visitor receives the normal form success response.
10. Confirm the owner receives the LINE push.
11. Confirm the database row:
    - `LineOaDelivery.status = SENT`
    - `LineOaDelivery.sentAt IS NOT NULL`
    - `LineOaDelivery.reasonCode IS NULL`

## Rollback

Application rollback:

- Revert API/worker deployment to the previous version.
- Stop the `line-oa` worker queue if it causes operational issues.
- Existing `LineOaDelivery` rows can remain; they are append-only operational history.

Quota display rollback:

- If usage display looks wrong, temporarily hide or freeze LINE OA usage in the dashboard while investigating.
- Do not return to blocking public lead submission; the approved behavior is submission success plus notification skip/failure status.

Schema rollback:

- Avoid dropping `LineOaDelivery` immediately after deploy because it is the audit source for successful sends, fallback status, and quota usage.
- If a hard schema rollback is required, export `LineOaDelivery` first for support/audit analysis.

## Known Tech Debt

- `Form.lineOaAccessToken` remains plaintext at rest. It must not be logged or returned in responses. Encryption-at-rest or managed secret storage should be a dedicated hardening task.
- The worker currently imports API services directly as part of the modular-monolith worker structure. This is acceptable for this phase but should be cleaned up when worker modules are formalized.
