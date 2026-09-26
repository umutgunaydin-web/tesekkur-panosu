/**
 * Kolay İK çalışan dizinini Supabase'e yükler.
 *
 *   npm run import:employees
 *   npm run import:employees -- ./data/kolayik_all_employees.csv
 *
 * E-posta çakışma anahtarıdır: aynı dosya ikinci kez çalışınca kayıt çoğalmaz,
 * mevcut çalışan kimlikleri korunur. CSV'de olmayan çalışanlar silinmez.
 *
 * Bağlantı: proje `supabase link` ile bağlıysa CLI yeterlidir.
 * CLI yoksa SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL gerekir.
 * Service role anahtarı yalnızca bu script'te, sunucu tarafında okunur.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const EXPECTED = {
  rows: 128,
  duplicateEmails: 0,
  missingNames: 0,
  missingEmails: 0,
  missingAvatars: 12,
};

type EmployeeRow = {
  name: string;
  email: string;
  avatar_url: string | null;
};

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  const source = input.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(current);
      current = "";
    } else if (char === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else if (char !== "\r") {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function loadRows(filePath: string): EmployeeRow[] {
  const table = parseCsv(readFileSync(filePath, "utf8"));
  const [header, ...body] = table;
  const records = body.filter((cells) => cells.some((cell) => cell.trim()));

  if (!header || header.join(",") !== "Name,Email,Avatar URL") {
    throw new Error(
      `Beklenmeyen CSV başlığı: ${(header ?? []).join(", ")}. "Name,Email,Avatar URL" olmalı.`,
    );
  }

  const missingNames = records.filter((cells) => !cells[0]?.trim()).length;
  const missingEmails = records.filter((cells) => !cells[1]?.trim()).length;
  const missingAvatars = records.filter((cells) => !cells[2]?.trim()).length;
  const emails = records.map((cells) => cells[1].trim().toLowerCase());
  const duplicateEmails = emails.filter(
    (email, index) => emails.indexOf(email) !== index,
  ).length;

  const actual = {
    rows: records.length,
    duplicateEmails,
    missingNames,
    missingEmails,
    missingAvatars,
  };

  const mismatch = (Object.keys(EXPECTED) as (keyof typeof EXPECTED)[]).filter(
    (key) => actual[key] !== EXPECTED[key],
  );

  if (mismatch.length > 0) {
    throw new Error(
      `CSV beklenen dizinle uyuşmuyor, içe aktarma durduruldu.\nBeklenen: ${JSON.stringify(EXPECTED)}\nBulunan:  ${JSON.stringify(actual)}`,
    );
  }

  return records.map((cells) => ({
    name: cells[0].trim(),
    email: cells[1].trim().toLowerCase(),
    avatar_url: cells[2]?.trim() ? cells[2].trim() : null,
  }));
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function buildUpsertSql(rows: EmployeeRow[]): string {
  const values = rows
    .map(
      (row) =>
        `(${sqlLiteral(row.name)}, ${sqlLiteral(row.email)}, ${
          row.avatar_url ? sqlLiteral(row.avatar_url) : "null"
        })`,
    )
    .join(",\n");

  return `
    insert into public.employees (name, email, avatar_url, is_active, source, updated_at, last_synced_at)
    select name, email, avatar_url, true, 'kolayik', now(), now()
    from (values
      ${values}
    ) as incoming(name, email, avatar_url)
    on conflict (email) do update set
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      is_active = true,
      source = excluded.source,
      updated_at = now(),
      last_synced_at = now();
  `;
}

function queryWithCli(sql: string): unknown {
  const directory = mkdtempSync(join(tmpdir(), "employees-"));
  const filePath = join(directory, "query.sql");
  writeFileSync(filePath, sql);

  const output = execFileSync(
    "supabase",
    ["db", "query", "--linked", "-f", filePath, "-o", "json"],
    { encoding: "utf8" },
  );

  const jsonStart = output.indexOf("{");
  if (jsonStart === -1) return [];

  const parsed = JSON.parse(output.slice(jsonStart)) as { rows?: unknown };
  return parsed.rows ?? [];
}

async function existingEmails(
  rows: EmployeeRow[],
): Promise<Set<string>> {
  const list = rows.map((row) => sqlLiteral(row.email)).join(",");
  const result = queryWithCli(
    `select email from public.employees where email in (${list})`,
  ) as { email: string }[];

  return new Set(result.map((row) => row.email));
}

async function importWithServiceRole(rows: EmployeeRow[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Service role bilgisi eksik.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: readError } = await supabase
    .from("employees")
    .select("email")
    .in(
      "email",
      rows.map((row) => row.email),
    );

  if (readError) throw new Error(readError.message);

  const known = new Set((existing ?? []).map((row) => row.email as string));
  const now = new Date().toISOString();

  const { error } = await supabase.from("employees").upsert(
    rows.map((row) => ({
      name: row.name,
      email: row.email,
      avatar_url: row.avatar_url,
      is_active: true,
      source: "kolayik",
      updated_at: now,
      last_synced_at: now,
    })),
    { onConflict: "email" },
  );

  if (error) throw new Error(error.message);

  printSummary(rows, known);
}

function printSummary(rows: EmployeeRow[], known: Set<string>) {
  const updated = rows.filter((row) => known.has(row.email)).length;

  console.log(`Employees processed: ${rows.length}`);
  console.log(`Inserted: ${rows.length - updated}`);
  console.log(`Updated: ${updated}`);
  console.log("Skipped: 0");
  console.log(
    `Missing avatars: ${rows.filter((row) => !row.avatar_url).length}`,
  );
}

async function main() {
  const filePath = resolve(
    process.argv[2] ?? "data/kolayik_all_employees.csv",
  );
  const rows = loadRows(filePath);

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await importWithServiceRole(rows);
    return;
  }

  const known = await existingEmails(rows);
  queryWithCli(buildUpsertSql(rows));
  printSummary(rows, known);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
