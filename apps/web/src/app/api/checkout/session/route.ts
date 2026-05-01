import { NextResponse } from "next/server";

type CheckoutRequestBody = {
  apiBaseUrl?: string;
  accessToken?: string;
  workspaceId?: string;
  planCode?: string;
  billingInterval?: string;
  checkoutMode?: "redirect" | "embedded";
};

type ApiErrorEnvelope = {
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

function parseErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (typeof payload === "object" && payload !== null) {
    const parsed = payload as ApiErrorEnvelope;
    const nested = parsed.error?.message || parsed.error?.code;
    if (nested) {
      return nested;
    }

    if (parsed.message) {
      return parsed.message;
    }
  }

  return fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutRequestBody;

    const apiBaseUrl = body.apiBaseUrl?.trim().replace(/\/$/, "") ?? "";
    const accessToken = body.accessToken?.trim() ?? "";
    const workspaceId = body.workspaceId?.trim() ?? "";
    const planCode = body.planCode?.trim().toUpperCase() ?? "";
    const billingInterval = body.billingInterval?.trim().toUpperCase() ?? "";
    const checkoutMode =
      body.checkoutMode === "embedded" ? "embedded" : "redirect";

    if (
      !apiBaseUrl ||
      !accessToken ||
      !workspaceId ||
      !planCode ||
      !billingInterval
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required checkout fields.",
        },
        { status: 400 },
      );
    }

    const endpoint =
      checkoutMode === "embedded"
        ? `${apiBaseUrl}/billing/checkout-session/embedded`
        : `${apiBaseUrl}/billing/checkout-session`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        workspaceId,
        planCode,
        billingInterval,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { url?: string; clientSecret?: string; sessionId?: string }
      | ApiErrorEnvelope
      | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: parseErrorMessage(
            payload,
            `Request failed with status ${response.status}`,
          ),
        },
        { status: response.status },
      );
    }

    if (checkoutMode === "embedded") {
      const clientSecret =
        payload && typeof payload === "object" && "clientSecret" in payload
          ? String(payload.clientSecret ?? "")
          : "";

      if (!clientSecret) {
        return NextResponse.json(
          {
            success: false,
            message: "Checkout client secret was not returned by the API.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        clientSecret,
      });
    }

    const checkoutUrl =
      payload && typeof payload === "object" && "url" in payload
        ? String(payload.url ?? "")
        : "";

    if (!checkoutUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Checkout URL was not returned by the API.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to create checkout session.",
      },
      { status: 500 },
    );
  }
}
