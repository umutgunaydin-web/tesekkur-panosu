import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];

  try {
    const line = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((entry) => entry.startsWith(`${name}=`));

    return line?.slice(name.length + 1).trim();
  } catch {
    return undefined;
  }
}

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

test(
  "anon anahtar status=approved yazamaz",
  { skip: !url || !anonKey },
  async () => {
    const headers = {
      apikey: anonKey!,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    const listed = await fetch(
      `${url}/rest/v1/thanks_messages?select=id,status&status=eq.approved&limit=1`,
      { headers },
    );
    const rows = (await listed.json()) as { id: string; status: string }[];
    assert.equal(listed.status, 200);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "approved");

    const forced = await fetch(
      `${url}/rest/v1/thanks_messages?id=eq.${rows[0].id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "approved", moderation_reason: "forced" }),
      },
    );

    assert.notEqual(forced.status, 200);
    assert.notEqual(forced.status, 204);

    const employees = await fetch(
      `${url}/rest/v1/employees?select=id&is_active=eq.true&limit=1`,
      { headers },
    );
    const [employee] = (await employees.json()) as { id: string }[];

    const inserted = await fetch(`${url}/rest/v1/thanks_messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: "Bu mesaj istemciden onaylı diye işaretlenmeye çalışıldı.",
        sender: "Test",
        receiver: "Test",
        recipient_employee_id: employee.id,
        category_tag: "Destek",
        color_theme: "pink",
        status: "approved",
      }),
    });

    assert.ok(inserted.status >= 400);

    const removed = await fetch(
      `${url}/rest/v1/thanks_messages?id=eq.${rows[0].id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "removed" }),
      },
    );
    assert.notEqual(removed.status, 200);
    assert.notEqual(removed.status, 204);

    const reason = await fetch(
      `${url}/rest/v1/thanks_messages?select=moderation_reason&status=eq.approved&limit=1`,
      { headers },
    );
    assert.notEqual(reason.status, 200);
  },
);
