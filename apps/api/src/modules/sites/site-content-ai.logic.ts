import {
  BODY_KEYS,
  HEADLINE_KEYS,
  containsPlaceholder,
  containsThai,
  isFillerText,
  type QualityReport,
} from "@finnweb/shared";

/**
 * Prop keys the AI is allowed to rewrite. Everything else — URLs, colors,
 * layout flags, structure — is ignored no matter what the model returns, so a
 * bad completion can only produce bad wording, never a broken page.
 */
export const EDITABLE_COPY_KEYS: readonly string[] = [
  ...HEADLINE_KEYS,
  ...BODY_KEYS,
  "eyebrow",
  "buttonText",
  "ctaText",
  "caption",
];

const COPY_KEY_SET = new Set(EDITABLE_COPY_KEYS);

export type CopySlot = {
  sectionIndex: number;
  sectionType: string;
  key: string;
  current: string;
};

export type SectionLike = {
  type: string;
  isVisible?: boolean;
  props?: Record<string, unknown> | null;
};

/** The copy the model is asked to rewrite, in a flat, addressable form. */
export function collectCopySlots(sections: SectionLike[]): CopySlot[] {
  const slots: CopySlot[] = [];

  sections.forEach((section, sectionIndex) => {
    if (section.isVisible === false || !section.props) {
      return;
    }

    for (const [key, value] of Object.entries(section.props)) {
      if (!COPY_KEY_SET.has(key) || typeof value !== "string") {
        continue;
      }
      slots.push({
        sectionIndex,
        sectionType: section.type,
        key,
        current: value,
      });
    }
  });

  return slots;
}

export type CopyProposal = {
  sectionIndex: number;
  key: string;
  value: string;
};

/**
 * Keeps only proposals that are safe to apply: a known slot, real Thai copy,
 * and free of the placeholder and filler patterns the quality engine rejects.
 * Filtering here means the engine never has to catch these, and the owner
 * never sees a proposal that would fail the publish gate.
 */
export function sanitizeProposals(
  proposals: CopyProposal[],
  slots: CopySlot[],
): CopyProposal[] {
  const slotIndex = new Map(
    slots.map((slot) => [`${slot.sectionIndex}:${slot.key}`, slot]),
  );

  return proposals.filter((proposal) => {
    const slot = slotIndex.get(`${proposal.sectionIndex}:${proposal.key}`);
    if (!slot) {
      return false;
    }

    const value = typeof proposal.value === "string" ? proposal.value.trim() : "";
    if (!value) {
      return false;
    }

    if (containsPlaceholder(value) || isFillerText(value)) {
      return false;
    }

    // The whole point is Thai-native copy; an English completion is a failure
    // to fall back from, not something to write onto the page.
    return containsThai(value);
  });
}

/** Applies proposals onto a copy of the sections, leaving the input untouched. */
export function applyCopyProposals<T extends SectionLike>(
  sections: T[],
  proposals: CopyProposal[],
): T[] {
  const next = sections.map((section) => ({
    ...section,
    props: section.props ? { ...section.props } : section.props,
  }));

  for (const proposal of proposals) {
    const section = next[proposal.sectionIndex];
    if (!section?.props) {
      continue;
    }
    section.props[proposal.key] = proposal.value.trim();
  }

  return next as T[];
}

/**
 * A rewrite is only kept when it does not make the page worse. Wording is
 * subjective; "did this introduce a blocking problem" is not.
 */
export function isProposalAcceptable(
  baseline: QualityReport,
  candidate: QualityReport,
): boolean {
  if (candidate.summary.errorCount > baseline.summary.errorCount) {
    return false;
  }
  return candidate.score >= baseline.score;
}
