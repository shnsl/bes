import assert from "node:assert/strict";
import test from "node:test";
import {
  canGoToNextWeek,
  countDone,
  emptyDay,
  formatDateKey,
  isFutureDay,
  startOfWeek,
} from "./week.ts";

const thursday = new Date(2026, 8, 24);

test("hafta pazartesi başlar", () => {
  assert.equal(formatDateKey(startOfWeek(thursday)), "2026-09-21");
  assert.equal(formatDateKey(startOfWeek(new Date(2026, 8, 27))), "2026-09-21");
  assert.equal(formatDateKey(startOfWeek(new Date(2026, 8, 21))), "2026-09-21");
});

test("gelecek gün ve sonraki hafta", () => {
  assert.equal(isFutureDay(new Date(2026, 8, 25), thursday), true);
  assert.equal(isFutureDay(thursday, thursday), false);
  assert.equal(canGoToNextWeek(new Date(2026, 8, 14), thursday), true);
  assert.equal(canGoToNextWeek(new Date(2026, 8, 21), thursday), false);
});

test("özet sayımı", () => {
  const day = emptyDay();
  day.sabah = true;
  day.yatsi = true;
  assert.equal(countDone({ "2026-09-21": day }, ["2026-09-21"]), 2);
});
