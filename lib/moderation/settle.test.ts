import assert from "node:assert/strict";
import test from "node:test";

import { buildRejectionEmail } from "../email/template";
import {
  settleModeration,
  type ModerationPatch,
  type ModerationPorts,
  type StoredRecognition,
} from "./settle";
import { parseModerationVerdict } from "./verdict";

const NOW = new Date("2026-09-26T00:00:00.000Z");

function pendingRow(message: string): StoredRecognition {
  return {
    id: "rec-1",
    status: "pending",
    sender: "Anonim",
    message,
    category: "Destek",
    recipientName: "Zeynep Köpüklü",
    rejectionEmailSentAt: null,
  };
}

function harness(options: {
  row: StoredRecognition | null;
  classify: ModerationPorts["classify"];
}) {
  const saves: ModerationPatch[] = [];
  const emails: unknown[] = [];
  let emailStamped = false;
  let failEmail = false;

  const ports: ModerationPorts = {
    now: () => NOW,
    load: async () => options.row,
    classify: options.classify,
    save: async (_id, patch) => {
      saves.push(patch);
      if (options.row) options.row.status = patch.status;
      return true;
    },
    sendRejectionEmail: async (input) => {
      if (failEmail) throw new Error("email_provider_500");
      emails.push(input);
    },
    markRejectionEmailSent: async () => {
      emailStamped = true;
      if (options.row) options.row.rejectionEmailSentAt = NOW.toISOString();
    },
  };

  return {
    ports,
    saves,
    emails,
    wasStamped: () => emailStamped,
    failNextEmail: () => {
      failEmail = true;
    },
  };
}

test("parse accepts a valid verdict and rejects unknown decisions", () => {
  assert.deepEqual(
    parseModerationVerdict({
      decision: "APPROVE",
      reason: "Samimi teşekkür.",
      confidence: 0.9,
    })?.decision,
    "APPROVE",
  );
  assert.equal(
    parseModerationVerdict({ decision: "MAYBE", reason: "x", confidence: 0.5 }),
    null,
  );
  assert.equal(
    parseModerationVerdict({ decision: "APPROVE", reason: "", confidence: 1.2 }),
    null,
  );
});

const cases: Array<{
  message: string;
  decision: "APPROVE" | "REJECT";
}> = [
  {
    message: "Yoğun günde bana destek olduğun için teşekkür ederim.",
    decision: "APPROVE",
  },
  {
    message: "Toplantı öncesi hızlı desteğin için çok teşekkürler.",
    decision: "APPROVE",
  },
  {
    message: "Sonunda bir işi zamanında yaptığın için teşekkürler.",
    decision: "REJECT",
  },
  {
    message: "Bu kez işi batırmadığın için teşekkürler.",
    decision: "REJECT",
  },
  {
    message: "Keşke herkes senin kadar işini düzgün yapsa.",
    decision: "REJECT",
  },
  {
    message: "Aptalsın, işe yaramazsın.",
    decision: "REJECT",
  },
];

for (const sample of cases) {
  test(`${sample.decision} kararını uygular: ${sample.message}`, async () => {
    const row = pendingRow(sample.message);
    const state = harness({
      row,
      classify: async () => ({
        decision: sample.decision,
        reason:
          sample.decision === "APPROVE"
            ? "Samimi bir teşekkür."
            : "Eleştiri ya da hakaret içeriyor.",
        confidence: 0.91,
      }),
    });

    const result = await settleModeration(row.id, state.ports);

    assert.equal(
      result.outcome,
      sample.decision === "APPROVE" ? "approved" : "rejected",
    );
    assert.equal(state.saves[0]?.publishedAt !== null, sample.decision === "APPROVE");
    assert.equal(state.emails.length, sample.decision === "REJECT" ? 1 : 0);
    assert.equal(result.emailSent, sample.decision === "REJECT");
  });
}

test("Gemini erişilemezse mesaj yayınlanmaz", async () => {
  const row = pendingRow("Teşekkür ederim.");
  const state = harness({
    row,
    classify: async () => {
      throw new Error("fetch failed");
    },
  });

  const result = await settleModeration(row.id, state.ports);

  assert.equal(result.outcome, "moderation_error");
  assert.equal(result.errorType, "Error");
  assert.equal(state.saves[0]?.publishedAt, null);
  assert.equal(state.saves[0]?.status, "moderation_error");
  assert.equal(state.emails.length, 0);
});

test("geçersiz model çıktısı yayınlamaz", async () => {
  const row = pendingRow("Teşekkür ederim.");
  const state = harness({
    row,
    classify: async () => ({ decision: "PUBLISH", reason: "tamam" }),
  });

  const result = await settleModeration(row.id, state.ports);

  assert.equal(result.outcome, "moderation_error");
  assert.equal(result.errorType, "invalid_response");
  assert.equal(state.emails.length, 0);
});

test("ret e-postası aynı kayıt için bir kez gider", async () => {
  const row = pendingRow("Bu kez işi batırmadığın için teşekkürler.");
  const state = harness({
    row,
    classify: async () => ({
      decision: "REJECT",
      reason: "Eleştiri, teşekkür gibi yazılmış.",
      confidence: 0.88,
    }),
  });

  const first = await settleModeration(row.id, state.ports);
  const second = await settleModeration(row.id, state.ports);

  assert.equal(first.emailSent, true);
  assert.equal(second.outcome, "skipped");
  assert.equal(state.emails.length, 1);
  assert.equal(state.wasStamped(), true);
});

test("anonim gönderen e-postada gerçek adıyla görünmez", () => {
  const email = buildRejectionEmail({
    senderName: "Anonim",
    recipientName: "Zeynep Köpüklü",
    category: "Destek",
    message: "Bu kez işi batırmadığın için teşekkürler.",
    moderationReason: "Eleştiri, teşekkür gibi yazılmış.",
    moderationConfidence: 0.88,
  });

  assert.equal(email.subject, "Teşekkür Panosu – İçerik Moderasyon Bildirimi");
  assert.match(email.text, /Gönderen: Anonim/);
  assert.match(email.text, /Alıcı: Zeynep Köpüklü/);
  assert.doesNotMatch(email.text, /@/);
});
