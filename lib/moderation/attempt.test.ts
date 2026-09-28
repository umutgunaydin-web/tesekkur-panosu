import assert from "node:assert/strict";
import test from "node:test";

import { runModerationAttempts } from "./attempt";

const verdict = {
  decision: "APPROVE",
  reason: "Samimi teşekkür.",
  confidence: 0.8,
};

test("üç deneme sonra hata fırlatır", async () => {
  let calls = 0;

  await assert.rejects(
    () =>
      runModerationAttempts(
        async () => {
          calls += 1;
          throw new Error("fetch failed");
        },
        { delayMs: 0 },
      ),
    /fetch failed/,
  );
  assert.equal(calls, 3);
});

test("ikinci denemede geçerli karar döner", async () => {
  let calls = 0;
  const result = await runModerationAttempts(
    async () => {
      calls += 1;
      if (calls === 1) return { decision: "MAYBE" };
      return verdict;
    },
    { delayMs: 0 },
  );

  assert.equal(calls, 2);
  assert.equal(result.decision, "APPROVE");
});

test("son deneme yedek modele kalır", async () => {
  const models: number[] = [];
  await runModerationAttempts(
    async (attempt) => {
      models.push(attempt);
      if (attempt < 3) throw new Error("empty");
      return verdict;
    },
    { delayMs: 0 },
  );

  assert.deepEqual(models, [1, 2, 3]);
});
