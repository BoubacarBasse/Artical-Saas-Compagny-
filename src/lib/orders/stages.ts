/**
 * The production pipeline — single source of truth.
 *
 * Both data providers and every piece of UI read from this module. It is pure
 * data with no imports, so it can be used on the server, on the client, and
 * inside tests without dragging anything along.
 *
 * DESIGN NOTE — why `percent` is derived and never stored:
 * In v1 there is no admin UI. Staff advance an order by editing one cell in the
 * Supabase table editor. If progress were a second column, staff would have to
 * update two cells in sync and they would inevitably drift apart. So `stage` is
 * the only persisted field and progress is a pure function of it.
 */

export const ORDER_STAGES = [
  "brief_received",
  "writing",
  "editing",
  "review",
  "delivered",
  "cancelled",
] as const;

export type OrderStage = (typeof ORDER_STAGES)[number];

export interface StageMeta {
  /** Human-readable label for badges and timelines. */
  label: string;
  /** Progress percentage shown to the client. */
  percent: number;
  /** Position in the happy path. `null` for stages outside it (cancelled). */
  step: number | null;
  /** No further work will happen on the order. */
  terminal: boolean;
  /** CSS custom property holding this stage's accent colour (see globals.css). */
  cssVar: string;
  /** Shown to the client on the order detail page. */
  description: string;
}

export const STAGE_META: Record<OrderStage, StageMeta> = {
  brief_received: {
    label: "Brief received",
    percent: 10,
    step: 1,
    terminal: false,
    cssVar: "--color-stage-brief-received",
    description: "We have your brief and it is queued for a writer.",
  },
  writing: {
    label: "Writing",
    percent: 40,
    step: 2,
    terminal: false,
    cssVar: "--color-stage-writing",
    description: "A writer is working on the first draft.",
  },
  editing: {
    label: "Editing",
    percent: 65,
    step: 3,
    terminal: false,
    cssVar: "--color-stage-editing",
    description: "The draft is with an editor for revisions.",
  },
  review: {
    label: "Final review",
    percent: 85,
    step: 4,
    terminal: false,
    cssVar: "--color-stage-review",
    description: "Final quality check before delivery.",
  },
  delivered: {
    label: "Delivered",
    percent: 100,
    step: 5,
    terminal: true,
    cssVar: "--color-stage-delivered",
    description: "This article is finished and delivered.",
  },
  cancelled: {
    label: "Cancelled",
    percent: 0,
    step: null,
    terminal: true,
    cssVar: "--color-stage-cancelled",
    description: "This order was cancelled.",
  },
};

/** The stage every new order starts in. Enforced in the DB by an RLS policy. */
export const INITIAL_STAGE: OrderStage = "brief_received";

/** The happy path, in order. Excludes `cancelled`, which is off to the side. */
export const PIPELINE: OrderStage[] = ORDER_STAGES.filter(
  (s) => STAGE_META[s].step !== null,
).sort((a, b) => STAGE_META[a].step! - STAGE_META[b].step!);

export function stageProgress(stage: OrderStage): number {
  return STAGE_META[stage].percent;
}

/** Still in flight — drives the dashboard's "active orders" view. */
export function isActiveStage(stage: OrderStage): boolean {
  return !STAGE_META[stage].terminal;
}

export function isOrderStage(value: unknown): value is OrderStage {
  return typeof value === "string" && (ORDER_STAGES as readonly string[]).includes(value);
}
