import { COLOR_THEMES, type ColorTheme } from "@/lib/types";

export type CardDecoration = "heart" | "star" | "sun" | "people" | "sparkle";

type ThemeStyle = {
  /** Kart yüzeyi */
  card: string;
  /** Kategori rozeti */
  pill: string;
  /** Dekoratif ikon rengi */
  accent: string;
  /** Avatar halkası */
  ring: string;
};

/**
 * Referans tasarımdaki pastel kart paleti. Tailwind sınıfları statik yazılır
 * ki JIT derleyicisi hepsini üretebilsin.
 */
export const THEME_STYLES: Record<ColorTheme, ThemeStyle> = {
  pink: {
    card: "bg-[#FCE4EE]",
    pill: "bg-[#F8CADC] text-[#9B2C5F]",
    accent: "text-[#F07FAE]",
    ring: "ring-[#F8CADC]",
  },
  green: {
    card: "bg-[#DFF4E8]",
    pill: "bg-[#BFE8D2] text-[#1E6B4A]",
    accent: "text-[#5FC08C]",
    ring: "ring-[#BFE8D2]",
  },
  blue: {
    card: "bg-[#E1EEFB]",
    pill: "bg-[#C5DDF6] text-[#1F4E7A]",
    accent: "text-[#6BA8E0]",
    ring: "ring-[#C5DDF6]",
  },
  yellow: {
    card: "bg-[#FDF2D6]",
    pill: "bg-[#F9E0A4] text-[#7A5A12]",
    accent: "text-[#EFBB45]",
    ring: "ring-[#F9E0A4]",
  },
  purple: {
    card: "bg-[#EDE6FB]",
    pill: "bg-[#D9CBF6] text-[#452A86]",
    accent: "text-[#9C7BE8]",
    ring: "ring-[#D9CBF6]",
  },
  rose: {
    card: "bg-[#FBE6EC]",
    pill: "bg-[#F6CCD8] text-[#96274C]",
    accent: "text-[#EC7C9E]",
    ring: "ring-[#F6CCD8]",
  },
};

const DECORATIONS: CardDecoration[] = [
  "heart",
  "sparkle",
  "sun",
  "people",
  "star",
];

export function resolveTheme(value: string | null | undefined): ThemeStyle {
  const theme = COLOR_THEMES.find((item) => item === value) ?? "pink";

  return THEME_STYLES[theme];
}

/** Aynı sayfadaki kartların farklı süslemeler alması için sırayla dağıtılır. */
export function resolveDecoration(index: number): CardDecoration {
  return DECORATIONS[index % DECORATIONS.length];
}

/** Kartların ekranda tek renge düşmemesi için kayıt anında atanan tema. */
export function pickRandomTheme(): ColorTheme {
  return COLOR_THEMES[Math.floor(Math.random() * COLOR_THEMES.length)];
}
