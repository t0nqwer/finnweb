export const JOB_QUEUE_NAMES = {
  billing: "billing",
  lineOa: "line-oa",
} as const;

export const JOB_NAMES = {
  billingStripeEvent: "billing.stripe.event",
  lineOaLeadNotification: "line-oa.lead.notification",
} as const;

export const SUPPORTED_BILLING_EVENT_TYPES = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export type SupportedBillingEventType =
  (typeof SUPPORTED_BILLING_EVENT_TYPES)[number];

export type BillingStripeEventPayload = {
  eventId: string;
  eventType: SupportedBillingEventType;
  object: Record<string, unknown>;
  queuedAt: string;
};

export type LineOaLeadNotificationPayload = {
  formSubmissionId: string;
};

export function isSupportedBillingEventType(
  value: string,
): value is SupportedBillingEventType {
  return (SUPPORTED_BILLING_EVENT_TYPES as readonly string[]).includes(value);
}
