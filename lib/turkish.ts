const BACK_VOWELS = "aıouâ";
const FRONT_VOWELS = "eiöü";
const VOWELS = `${BACK_VOWELS}${FRONT_VOWELS}`;

/** "Elif Y." gibi kısaltılmış soyadı baş harflerini ayıklar. */
function stripInitials(name: string): string {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter((token) => !/^[\p{Lu}]\.$/u.test(token));

  return tokens.length > 0 ? tokens.join(" ") : name.trim();
}

/**
 * İsmi yönelme hâline çevirir: "Zeynep" → "Zeynep'e", "Arda" → "Arda'ya".
 * Ünlü uyumuna göre a/e seçer, ünlüyle biten isimlerde kaynaştırma y'si ekler.
 */
export function toDativeCase(name: string): string {
  const base = stripInitials(name);
  if (!base) return name;

  const lower = base.toLocaleLowerCase("tr-TR");
  const lastVowel = [...lower].reverse().find((char) => VOWELS.includes(char));

  if (!lastVowel) return `${base}'e`;

  const suffix = BACK_VOWELS.includes(lastVowel) ? "a" : "e";
  const endsWithVowel = VOWELS.includes(lower[lower.length - 1]);

  return `${base}'${endsWithVowel ? "y" : ""}${suffix}`;
}

/** Avatar görseli yoksa baş harfler: "Zeynep Köpüklü" → "ZK", "Ali Kahya" → "AK". */
export function getInitials(name: string): string {
  const tokens = name
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/\./g, ""))
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return "?";

  const first = tokens[0].charAt(0);
  const last = tokens.length > 1 ? tokens[tokens.length - 1].charAt(0) : "";

  return `${first}${last}`.toLocaleUpperCase("tr-TR");
}
