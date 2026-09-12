import { expect, test } from "@playwright/test";
import {
  INITIAL_STAGE,
  ORDER_STAGES,
  PIPELINE,
  STAGE_META,
  isActiveStage,
  isOrderStage,
  stageProgress,
} from "@/lib/orders/stages";

test.describe("pipeline stages", () => {
  test("the happy path is ordered and excludes cancelled", () => {
    expect(PIPELINE).toEqual([
      "brief_received",
      "writing",
      "editing",
      "review",
      "delivered",
    ]);
    expect(PIPELINE).not.toContain("cancelled");
  });

  test("new orders start at the first pipeline stage", () => {
    expect(INITIAL_STAGE).toBe(PIPELINE[0]);
  });

  test("progress increases monotonically along the pipeline", () => {
    const percents = PIPELINE.map(stageProgress);
    const ascending = [...percents].sort((a, b) => a - b);
    expect(percents).toEqual(ascending);
    expect(new Set(percents).size).toBe(percents.length);
  });

  test("the pipeline runs from above zero to exactly 100", () => {
    expect(stageProgress(PIPELINE[0])).toBeGreaterThan(0);
    expect(stageProgress("delivered")).toBe(100);
  });

  test("only delivered and cancelled are terminal", () => {
    const terminal = ORDER_STAGES.filter((s) => STAGE_META[s].terminal);
    expect([...terminal].sort()).toEqual(["cancelled", "delivered"]);
    expect(isActiveStage("writing")).toBe(true);
    expect(isActiveStage("delivered")).toBe(false);
    expect(isActiveStage("cancelled")).toBe(false);
  });

  test("cancelled sits outside the pipeline", () => {
    expect(STAGE_META.cancelled.step).toBeNull();
    expect(stageProgress("cancelled")).toBe(0);
  });

  test("every stage has metadata and a distinct colour token", () => {
    const vars = ORDER_STAGES.map((s) => STAGE_META[s].cssVar);
    expect(new Set(vars).size).toBe(ORDER_STAGES.length);
    for (const stage of ORDER_STAGES) {
      expect(STAGE_META[stage].label.length).toBeGreaterThan(0);
      expect(STAGE_META[stage].description.length).toBeGreaterThan(0);
    }
  });

  test("the type guard rejects anything not a stage", () => {
    expect(isOrderStage("writing")).toBe(true);
    expect(isOrderStage("delivered_maybe")).toBe(false);
    expect(isOrderStage(null)).toBe(false);
    expect(isOrderStage(3)).toBe(false);
  });
});
