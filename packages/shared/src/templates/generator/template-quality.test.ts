import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  generateTemplate,
  getAvailableBlueprints,
  getAvailableContentPacks,
  getAvailableThemes,
} from "./generate-template";
import { evaluateSiteQuality } from "../../quality/evaluate-quality";
import type { QualityPage } from "../../quality/page-quality.types";

/**
 * The acceptance gate for shipped templates: anything a Thai SME can generate
 * must already be publishable. If this fails, the template — not the rule —
 * is what changed.
 */
describe("shipped templates meet the quality bar", () => {
  const combos = getAvailableBlueprints().flatMap((blueprint) =>
    getAvailableContentPacks()
      .filter((pack) => pack.industry === blueprint.industry)
      .flatMap((pack) =>
        getAvailableThemes().map((theme) => ({ blueprint, pack, theme })),
      ),
  );

  it("covers every blueprint with at least one content pack", () => {
    assert.ok(combos.length > 0);
    for (const blueprint of getAvailableBlueprints()) {
      assert.ok(
        combos.some((combo) => combo.blueprint.id === blueprint.id),
        `${blueprint.id} has no matching content pack`,
      );
    }
  });

  for (const { blueprint, pack, theme } of combos) {
    it(`${blueprint.id} + ${pack.id} + ${theme.id} scores a clean 100`, () => {
      const template = generateTemplate({
        industry: blueprint.industry,
        blueprintId: blueprint.id,
        themeId: theme.id,
        contentPackId: pack.id,
      });

      const report = evaluateSiteQuality({
        pages: template.pages as unknown as QualityPage[],
        themeConfig: template.themeConfig,
        locale: "th",
      });

      assert.deepEqual(
        report.issues.map((issue) => `${issue.severity} ${issue.code} @ ${issue.path}`),
        [],
      );
      assert.equal(report.score, 100);
    });
  }
});
