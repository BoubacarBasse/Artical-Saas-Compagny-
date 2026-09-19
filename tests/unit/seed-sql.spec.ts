import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Shape rules for supabase/seed_hosted.sql.
 *
 * Both rules exist because the file broke on the hosted Supabase SQL editor in
 * ways that no amount of local testing caught — it ran perfectly against a real
 * Postgres 16 every time. The editor splits a script client-side before sending
 * it, and both failures were that splitter disagreeing with Postgres about
 * where one statement ends.
 */

const FILES = ["seed_hosted.sql", "cleanup_hosted.sql"];

const read = (name: string) =>
  readFileSync(join(process.cwd(), "supabase", name), "utf8").split("\n");

const isComment = (line: string) => /^\s*--/.test(line);

for (const name of FILES) {
  const SQL = read(name);

  test.describe(`${name} shape`, () => {
    test("no comment contains an apostrophe", () => {
      // A lone quote character in a comment opens a string literal as far as a
      // naive splitter is concerned, so it swallows the terminating semicolon and
      // submits an unterminated statement. The symptom is a LINE 0
      // "syntax error at end of input", which points at nothing and is miserable
      // to trace back to a possessive in a comment ninety lines up.
      //
      // Balanced pairs would survive a splitter that tracks quote state, but the
      // rule is absolute on purpose: "keep the count even" is a rule nobody can
      // follow while editing prose.
      const offenders = SQL.map((line, i) => [i + 1, line] as const).filter(
        ([, line]) => isComment(line) && line.includes("'"),
      );

      expect(
        offenders.map(([n, line]) => `line ${n}: ${line.trim()}`),
        "apostrophes in comments break the hosted SQL editor",
      ).toEqual([]);
    });

    test("the seed is exactly one statement", () => {
      // Earlier versions were ordinary multi-statement scripts using temporary
      // tables to pass state along. They worked locally and failed on hosted with
      // `relation "seed_user" does not exist` — every piece proven to work there
      // in isolation, only the assembly failing, and identically with permanent
      // tables, so it was never temp-table scope. The editor rolls the batch back,
      // so there is nothing to inspect afterwards.
      //
      // Rather than predict how it chunks a script, the file stopped giving it
      // anything to chunk. One statement means no cross-statement state to lose.
      const code = SQL.filter((line) => !isComment(line)).join("\n");
      const semicolons = (code.match(/;/g) ?? []).length;

      expect(semicolons, `${name} must be a single statement`).toBe(1);
      expect(code.trimEnd().endsWith(";")).toBe(true);
    });
  });
}
