"use client";

import { useState } from "react";
import { submitPublicLead } from "@/features/site-renderer/public-site.api";

type ContactFormSectionProps = {
  props: Record<string, unknown>;
};

function readString(
  props: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = props[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactFormSection({ props }: ContactFormSectionProps) {
  const title = readString(props, "title", "ติดต่อเรา");
  const subtitle = readString(
    props,
    "subtitle",
    "กรอกข้อมูลด้านล่างแล้วเราจะติดต่อกลับโดยเร็ว",
  );
  const buttonText = readString(props, "buttonText", "ส่งข้อมูล");
  const successMessage = readString(
    props,
    "successMessage",
    "ส่งข้อมูลเรียบร้อยแล้ว ขอบคุณมากค่ะ!",
  );
  const accentColor = readString(props, "accentColor", "#FF8C00");

  const siteId = typeof props._siteId === "string" ? props._siteId : null;
  const pageId = typeof props._pageId === "string" ? props._pageId : undefined;
  const sectionId =
    typeof props._sectionId === "string" ? props._sectionId : undefined;

  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  /** Honeypot — hidden from real users. Bots fill it in. */
  const [hp, setHp] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!siteId) {
      return;
    }

    setFormState("submitting");
    setErrorMessage(null);

    const result = await submitPublicLead({
      siteId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      message: message.trim() || undefined,
      pageId,
      sectionId,
      ...(hp ? { _hp: hp } : {}),
    });

    if (result.ok) {
      setFormState("success");
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } else {
      setFormState("error");
      const msg =
        result.error === "NETWORK_ERROR"
          ? "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง"
          : "เกิดข้อผิดพลาด กรุณาตรวจสอบข้อมูลแล้วลองใหม่";
      setErrorMessage(msg);
    }
  }

  if (formState === "success") {
    return (
      <div className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-lg rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="font-kanit text-lg font-semibold text-green-700">
            {successMessage}
          </p>
        </div>
      </div>
    );
  }

  const isSubmitting = formState === "submitting";

  return (
    <div className="px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-lg">
        <h2 className="font-kanit text-3xl font-semibold text-[#1A1C23]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">{subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {/* Honeypot field — visually hidden from real users */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-9999px",
              left: 0,
              height: 0,
              width: 0,
              overflow: "hidden",
              opacity: 0,
            }}
          >
            <label htmlFor="cf-hp">Leave this empty</label>
            <input
              id="cf-hp"
              name="_hp"
              type="text"
              autoComplete="off"
              tabIndex={-1}
              value={hp}
              onChange={(e) => setHp(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="cf-name"
              className="mb-1.5 block text-sm font-medium text-[#1A1C23]"
            >
              ชื่อ – นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              id="cf-name"
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#1A1C23] placeholder:text-slate-400 focus:outline-none focus:ring-2"
              style={{ focusRingColor: accentColor } as React.CSSProperties}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="cf-phone"
              className="mb-1.5 block text-sm font-medium text-[#1A1C23]"
            >
              เบอร์โทรศัพท์ <span className="text-red-500">*</span>
            </label>
            <input
              id="cf-phone"
              type="tel"
              required
              maxLength={32}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เช่น 0812345678"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#1A1C23] placeholder:text-slate-400 focus:outline-none focus:ring-2"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="cf-email"
              className="mb-1.5 block text-sm font-medium text-[#1A1C23]"
            >
              อีเมล{" "}
              <span className="text-xs font-normal text-slate-400">
                (ไม่บังคับ)
              </span>
            </label>
            <input
              id="cf-email"
              type="email"
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#1A1C23] placeholder:text-slate-400 focus:outline-none focus:ring-2"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="cf-message"
              className="mb-1.5 block text-sm font-medium text-[#1A1C23]"
            >
              ข้อความ{" "}
              <span className="text-xs font-normal text-slate-400">
                (ไม่บังคับ)
              </span>
            </label>
            <textarea
              id="cf-message"
              rows={4}
              maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="บอกเราเพิ่มเติมเกี่ยวกับความต้องการของคุณ..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#1A1C23] placeholder:text-slate-400 focus:outline-none focus:ring-2"
              disabled={isSubmitting}
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !phone.trim()}
            className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {isSubmitting ? "กำลังส่ง..." : buttonText}
          </button>
        </form>
      </div>
    </div>
  );
}
