import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyCopyProposals,
  collectCopySlots,
  isProposalAcceptable,
  sanitizeProposals,
  type SectionLike,
} from "./site-content-ai.logic";
import type { QualityReport } from "@finnweb/shared";

function sections(): SectionLike[] {
  return [
    {
      type: "HERO",
      isVisible: true,
      props: {
        title: "หัวข้อเดิม",
        description: "คำอธิบายเดิม",
        imageUrl: "https://cdn.example.com/a.jpg",
        backgroundColor: "#1A1C23",
      },
    },
    {
      type: "FORM",
      isVisible: true,
      props: { title: "ติดต่อเรา" },
    },
    {
      type: "CONTENT",
      isVisible: false,
      props: { title: "ซ่อนอยู่" },
    },
  ];
}

function report(errorCount: number, score: number): QualityReport {
  return {
    passed: errorCount === 0,
    score,
    summary: { errorCount, warningCount: 0, pageCount: 1, sectionCount: 3 },
    issues: [],
  };
}

describe("collectCopySlots", () => {
  it("offers only editable copy from visible sections", () => {
    const slots = collectCopySlots(sections());
    const keys = slots.map((slot) => `${slot.sectionIndex}.${slot.key}`);

    assert.deepEqual(keys, ["0.title", "0.description", "1.title"]);
  });

  it("never offers media or styling props", () => {
    const slots = collectCopySlots(sections());

    assert.ok(!slots.some((slot) => slot.key === "imageUrl"));
    assert.ok(!slots.some((slot) => slot.key === "backgroundColor"));
  });
});

describe("sanitizeProposals", () => {
  const slots = collectCopySlots(sections());

  it("keeps real Thai copy for a known slot", () => {
    const kept = sanitizeProposals(
      [{ sectionIndex: 0, key: "title", value: "ร้านกาแฟใจกลางเมือง" }],
      slots,
    );

    assert.equal(kept.length, 1);
  });

  it("drops slots the model invented", () => {
    const kept = sanitizeProposals(
      [
        { sectionIndex: 0, key: "imageUrl", value: "https://evil.example.com" },
        { sectionIndex: 9, key: "title", value: "ไม่มี section นี้" },
      ],
      slots,
    );

    assert.deepEqual(kept, []);
  });

  it("drops English, empty, placeholder, and filler copy", () => {
    const kept = sanitizeProposals(
      [
        { sectionIndex: 0, key: "title", value: "Our Coffee Shop Downtown" },
        { sectionIndex: 0, key: "description", value: "   " },
        { sectionIndex: 1, key: "title", value: "ติดต่อ {{businessName}}" },
      ],
      slots,
    );

    assert.deepEqual(kept, []);
  });

  it("drops Thai filler text", () => {
    const kept = sanitizeProposals(
      [{ sectionIndex: 0, key: "title", value: "ข้อความตัวอย่าง" }],
      slots,
    );

    assert.deepEqual(kept, []);
  });
});

describe("applyCopyProposals", () => {
  it("writes only the proposed keys and leaves the input untouched", () => {
    const original = sections();
    const next = applyCopyProposals(original, [
      { sectionIndex: 0, key: "title", value: "  ร้านกาแฟใจกลางเมือง  " },
    ]);

    assert.equal(next[0].props?.title, "ร้านกาแฟใจกลางเมือง");
    assert.equal(next[0].props?.description, "คำอธิบายเดิม");
    assert.equal(next[0].props?.imageUrl, "https://cdn.example.com/a.jpg");
    assert.equal(
      original[0].props?.title,
      "หัวข้อเดิม",
      "the caller's sections must not be mutated",
    );
  });
});

describe("isProposalAcceptable", () => {
  it("rejects a rewrite that introduces an error", () => {
    assert.equal(isProposalAcceptable(report(0, 100), report(1, 90)), false);
  });

  it("rejects a rewrite that lowers the score", () => {
    assert.equal(isProposalAcceptable(report(0, 100), report(0, 97)), false);
  });

  it("accepts a rewrite that holds or improves quality", () => {
    assert.equal(isProposalAcceptable(report(1, 90), report(0, 100)), true);
    assert.equal(isProposalAcceptable(report(0, 97), report(0, 97)), true);
  });
});
