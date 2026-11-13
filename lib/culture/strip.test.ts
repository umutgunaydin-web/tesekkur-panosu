import assert from "node:assert/strict";
import test from "node:test";

import { hasDeliberateRemoval, MAX_PIN_WAIT_MS, PIN_MS, sameOrder, schedulePinned } from "./strip";

const now = Date.parse("2026-11-14T12:00:00Z");
const at = (secondsAgo: number) => new Date(now - secondsAgo * 1000).toISOString();
const old = [
  { id: "a", created_at: at(3600) },
  { id: "b", created_at: at(1800) },
];

test("tek mesaj 1 dakika sabit kalır, sonra akışa katılır", () => {
  const items = [...old, { id: "n", created_at: at(20) }];
  const first = schedulePinned(items, new Map(), now);
  assert.equal(first.pinned?.id, "n");
  assert.deepEqual(first.flow.map((i) => i.id), ["a", "b"], "akış eskiden yeniye");

  const later = schedulePinned(items, new Map(), now + 41_000);
  assert.equal(later.pinned, null);
  assert.equal(later.flow.at(-1)?.id, "n");
});

test("arka arkaya gelenler sırayla 1'er dakika gösterilir, bekleyen akışta görünmez", () => {
  const items = [...old, { id: "x", created_at: at(10) }, { id: "y", created_at: at(5) }, { id: "z", created_at: at(1) }];
  const t0 = schedulePinned(items, new Map(), now);
  assert.equal(t0.pinned?.id, "x");
  assert.deepEqual(t0.waiting.map((i) => i.id), ["y", "z"]);
  assert.deepEqual(t0.flow.map((i) => i.id), ["a", "b"]);

  assert.equal(schedulePinned(items, new Map(), now + 55_000).pinned?.id, "y");
  assert.equal(schedulePinned(items, new Map(), now + 115_000).pinned?.id, "z");
  const done = schedulePinned(items, new Map(), now + 175_000);
  assert.equal(done.pinned, null);
  assert.deepEqual(done.flow.map((i) => i.id), ["a", "b", "x", "y", "z"]);
});

test("oturumda sonradan gelen eski tarihli mesaj geliş anına göre sıralanır", () => {
  const arrivals = new Map([["a", now - 5_000]]);
  assert.equal(schedulePinned(old, arrivals, now).pinned?.id, "a");
});

test("çok yoğun anda 5 dakikadan fazla bekleyecek mesaj sırayı atlar", () => {
  const burst = Array.from({ length: 8 }, (_, i) => ({ id: `m${i}`, created_at: at(1) }));
  const result = schedulePinned(burst, new Map(), now);
  assert.equal(result.pinned?.id, "m0");
  assert.equal(result.waiting.length, MAX_PIN_WAIT_MS / PIN_MS, "en fazla 5 dakikalık sıra");
  assert.deepEqual(result.flow.map((i) => i.id), ["m6", "m7"]);
});

test("yönetici kaldırması ile 30 sınırından düşme ayırt edilir", () => {
  const items = [...old, { id: "c", created_at: at(600) }, { id: "d", created_at: at(300) }];
  assert.equal(hasDeliberateRemoval(items, items.slice(1)), false, "en eski düştü: tur sonunu bekler");
  assert.equal(hasDeliberateRemoval(items, [items[0], items[2], items[3]]), true, "ortadan kaldırıldı");
  assert.equal(hasDeliberateRemoval(items, [...items, { id: "e", created_at: at(1) }]), false, "yalnız ekleme");
  assert.ok(sameOrder(items, [...items]));
});
