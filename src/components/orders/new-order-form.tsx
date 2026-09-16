"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction, type NewOrderActionState } from "@/lib/actions/orders";
import { ORDER_FORMATS, FORMAT_LABELS, type OrderFormat } from "@/lib/orders/statuses";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { counterClass, fieldClass, hintClass, labelClass } from "@/components/ui/form";

const TITLE_MAX = 120;
const BRIEF_MAX = 5000;
const KEYWORDS_MAX = 10;

const initialState: NewOrderActionState = {};

function counterColor(count: number, max: number): string {
  if (count > max) return "text-danger font-semibold";
  if (count > max * 0.9) return "text-warning";
  return "text-fg-faint";
}

export function NewOrderForm({
  defaultFormat,
  defaultWordCount,
}: {
  defaultFormat: OrderFormat | null;
  defaultWordCount: number | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createOrderAction, initialState);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [keywords, setKeywords] = useState("");

  const keywordChips = keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 shadow-sm">
      {state.error && (
        <div className="flex items-center gap-2.5 rounded-md border border-danger-surface-border bg-danger-surface px-3.5 py-3">
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-danger text-[12px] font-bold text-white">
            !
          </span>
          <span className="text-[13.5px] font-semibold text-danger">{state.error}</span>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor="title" className="text-[13px] font-semibold">
            Title
          </label>
          <span className={`${counterClass} ${counterColor(title.length, TITLE_MAX)}`}>
            {title.length} / {TITLE_MAX}
          </span>
        </div>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What should the piece be called?"
          className={fieldClass(Boolean(state.fieldErrors?.title))}
        />
        <FieldError>{state.fieldErrors?.title}</FieldError>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor="brief" className="text-[13px] font-semibold">
            Brief
          </label>
          <span className={`${counterClass} ${counterColor(brief.length, BRIEF_MAX)}`}>
            {brief.length} / {BRIEF_MAX}
          </span>
        </div>
        <textarea
          id="brief"
          name="brief"
          rows={6}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Audience, angle, anything the writer should read first"
          className={fieldClass(Boolean(state.fieldErrors?.brief), "resize-y")}
        />
        <FieldError>{state.fieldErrors?.brief}</FieldError>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor="keywords" className="text-[13px] font-semibold">
            Keywords
          </label>
          <span className={`${counterClass} ${counterColor(keywordChips.length, KEYWORDS_MAX)}`}>
            {keywordChips.length} / {KEYWORDS_MAX}
          </span>
        </div>
        <input
          id="keywords"
          name="keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Comma separated, up to ten"
          className={fieldClass(Boolean(state.fieldErrors?.keywords))}
        />
        {keywordChips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {keywordChips.map((k, i) => (
              <span
                key={`${k}-${i}`}
                className="rounded-md border border-border-subtle bg-surface-hover px-2.5 py-1 font-mono text-xs text-fg-muted"
              >
                {k}
              </span>
            ))}
          </div>
        )}
        <FieldError>{state.fieldErrors?.keywords}</FieldError>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="format" className={labelClass}>
            Format
          </label>
          <select
            id="format"
            name="format"
            defaultValue={defaultFormat ?? ""}
            className={fieldClass(Boolean(state.fieldErrors?.format), "cursor-pointer")}
          >
            <option value="">Choose a format</option>
            {ORDER_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
          <FieldError>{state.fieldErrors?.format}</FieldError>
        </div>
        <div>
          <label htmlFor="wordCount" className={labelClass}>
            Word count
          </label>
          <input
            id="wordCount"
            name="wordCount"
            inputMode="numeric"
            defaultValue={defaultWordCount ?? ""}
            placeholder="1500"
            className={fieldClass(Boolean(state.fieldErrors?.wordCount), "font-mono")}
          />
          {state.fieldErrors?.wordCount ? (
            <FieldError>{state.fieldErrors.wordCount}</FieldError>
          ) : (
            <p className={hintClass}>100–10,000 words</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="deadline" className={labelClass}>
          Deadline <span className="font-normal text-fg-faint">optional</span>
        </label>
        <input
          id="deadline"
          name="deadline"
          type="date"
          className={fieldClass(false, "font-mono")}
        />
        <p className={hintClass}>Leave empty for &ldquo;whenever you can&rdquo;</p>
      </div>

      <div className="flex items-center gap-3 border-t border-border-subtle pt-4">
        <Button type="submit" loading={pending}>
          {pending ? "Submitting" : "Submit order"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/orders")}>
          Cancel
        </Button>
        <span className="ml-auto text-xs text-fg-faint">Saved as Draft</span>
      </div>
    </form>
  );
}
