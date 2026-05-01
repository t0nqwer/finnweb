# LINE OA Quota Rollout (Safe)

## Goal

Enable LINE OA monthly quota visibility and enforcement readiness without schema-breaking changes.

## Approach

- No new DB columns are required for this phase.
- Monthly usage is derived from existing `FormSubmission` rows where related `Form.lineOaAccessToken` is configured.
- Quota limits come from `Plan.lineOaMonthlyQuota`.

## Rollout Steps

1. Deploy API changes that extend `/billing/plan-usage` with LINE OA monthly usage fields.
2. Deploy web dashboard changes that consume and display monthly used/quota.
3. Validate usage numbers with SQL spot checks (below) on production replica.
4. Monitor for 1 billing cycle, then wire hard-blocking into the actual LINE OA send path (when notification sender path is finalized).

## Validation Queries

```sql
-- Current month LINE OA-enabled submissions per workspace
SELECT s."workspaceId", COUNT(*) AS line_oa_monthly_used
FROM "FormSubmission" fs
JOIN "Form" f ON f."id" = fs."formId"
JOIN "Site" s ON s."id" = f."siteId"
WHERE fs."createdAt" >= date_trunc('month', now())
  AND fs."createdAt" < date_trunc('month', now()) + interval '1 month'
  AND f."lineOaAccessToken" IS NOT NULL
  AND f."lineOaAccessToken" <> ''
GROUP BY s."workspaceId"
ORDER BY line_oa_monthly_used DESC;
```

## Rollback

- API/Web rollback is safe and immediate (no schema migration to revert).
- If dashboard usage appears incorrect, revert to previous API response and keep data unchanged.

## Notes

- This phase provides accurate monthly usage telemetry for LINE OA-enabled forms.
- Hard-blocking at send-time should be implemented in the dedicated LINE OA delivery path once that path is available as a single runtime entry point.
