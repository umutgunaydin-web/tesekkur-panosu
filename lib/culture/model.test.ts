import assert from "node:assert/strict";
import test from "node:test";

import { computeCrop } from "./crop";
import {
  deriveStatus,
  formatEventAt,
  liveSlides,
  parseEmphasis,
  slideInputSchema,
  visibleLength,
} from "./model";

const now = new Date("2026-11-20T10:00:00Z");
const window = (starts: string, ends: string) => ({
  status: "published" as const,
  starts_at: starts,
  ends_at: ends,
});

test("durum tarihlerden türetilir", () => {
  assert.equal(deriveStatus({ ...window("2026-11-19T00:00:00Z", "2026-11-25T00:00:00Z"), status: "draft" }, now), "taslak");
  assert.equal(deriveStatus(window("2026-11-21T00:00:00Z", "2026-11-25T00:00:00Z"), now), "planlandi");
  assert.equal(deriveStatus(window("2026-11-19T00:00:00Z", "2026-11-25T00:00:00Z"), now), "yayinda");
  assert.equal(deriveStatus(window("2026-11-10T00:00:00Z", "2026-11-20T10:00:00Z"), now), "suresi_doldu");
});

test("TV yalnız yayındakileri sırayla gösterir", () => {
  const slides = [
    { ...window("2026-11-19T00:00:00Z", "2026-11-25T00:00:00Z"), sort_order: 2, id: "b" },
    { ...window("2026-11-19T00:00:00Z", "2026-11-25T00:00:00Z"), sort_order: 1, id: "a" },
    { ...window("2026-11-21T00:00:00Z", "2026-11-25T00:00:00Z"), sort_order: 0, id: "later" },
    { ...window("2026-11-19T00:00:00Z", "2026-11-25T00:00:00Z"), status: "draft" as const, sort_order: 0, id: "draft" },
  ];
  assert.deepEqual(liveSlides(slides, now).map((slide) => slide.id), ["a", "b"]);
});

test("kalın işareti ayrıştırılır, HTML üretilmez", () => {
  assert.deepEqual(parseEmphasis("Bugün **saat 15.00** Stüdyo'da"), [
    { text: "Bugün ", bold: false },
    { text: "saat 15.00", bold: true },
    { text: " Stüdyo'da", bold: false },
  ]);
  assert.deepEqual(parseEmphasis("<b>x</b> **açık"), [{ text: "<b>x</b> **açık", bold: false }]);
  assert.equal(visibleLength("**ab**c"), 3);
});

test("şema sınırları ve tür kurallarını uygular", () => {
  const base = {
    type: "duyuru" as const,
    eyebrow: "",
    title: "Yılbaşı izin planlaması",
    body: "",
    bullets: ["", "Kolay İK üzerinden"],
    starts_at: "2026-11-20T00:00:00Z",
    ends_at: "2026-11-27T00:00:00Z",
    status: "draft" as const,
  };
  const ok = slideInputSchema.safeParse(base);
  assert.ok(ok.success);
  assert.deepEqual(ok.success && ok.data.bullets, ["Kolay İK üzerinden"]);

  assert.equal(slideInputSchema.safeParse({ ...base, title: "x".repeat(61) }).success, false);
  assert.equal(slideInputSchema.safeParse({ ...base, title: `**${"x".repeat(60)}**` }).success, true);
  assert.equal(slideInputSchema.safeParse({ ...base, ends_at: base.starts_at }).success, false);
  assert.equal(slideInputSchema.safeParse({ ...base, type: "yeni_katilan" }).success, false);
  assert.equal(slideInputSchema.safeParse({ ...base, type: "etkinlik" }).success, false);
  assert.equal(slideInputSchema.safeParse({ ...base, bullets: ["a", "b", "c", "d"] }).success, false);
});

test("etkinlik tarihi İstanbul saatiyle yazılır", () => {
  assert.equal(formatEventAt("2026-11-27T12:00:00Z"), "27 Kasım · 15.00");
});

test("kırpma 16:9 ve odakta kalır", () => {
  assert.deepEqual(computeCrop(4000, 3000, 0.5, 0.5), { x: 0, y: 375, width: 4000, height: 2250 });
  assert.deepEqual(computeCrop(4000, 3000, 0.5, 0), { x: 0, y: 0, width: 4000, height: 2250 });
  assert.deepEqual(computeCrop(1000, 1000, 1, 0.5), { x: 0, y: 219, width: 1000, height: 563 });
  assert.deepEqual(computeCrop(3000, 1000, 0.9, 0.5), { x: 1222, y: 0, width: 1778, height: 1000 });
});

test("sıralama komşuyla yer değiştirir", async () => {
  const { moveInOrder } = await import("./model");
  const items = [
    { id: "a", sort_order: 0 },
    { id: "b", sort_order: 5 },
    { id: "c", sort_order: 9 },
  ];
  assert.deepEqual(moveInOrder(items, "c", "up"), [
    { id: "c", sort_order: 1 },
    { id: "b", sort_order: 2 },
  ]);
  assert.deepEqual(moveInOrder(items, "a", "up"), []);
  assert.deepEqual(moveInOrder(items, "a", "down"), [
    { id: "b", sort_order: 0 },
    { id: "a", sort_order: 1 },
    { id: "c", sort_order: 2 },
  ]);
});
