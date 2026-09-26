import type { ThanksMessage } from "@/lib/types";

export type CategoryFilter = {
  id: string;
  label: string;
  /** Bu filtreye düşen kategori etiketleri; boş dizi "diğer her şey" demek. */
  tags: string[];
};

/**
 * Pano üstündeki filtreler. `tags` boş olan "Diğer" seçeneği, adlandırılmış
 * filtrelerin hiçbirine girmeyen serbest etiketleri toplar.
 */
export const CATEGORY_FILTERS: CategoryFilter[] = [
  { id: "all", label: "Tümü", tags: [] },
  { id: "team", label: "Ekip Arkadaşları", tags: ["Ekip Ruhu"] },
  { id: "support", label: "Destek", tags: ["Destek"] },
  { id: "collaboration", label: "İş Birliği", tags: ["İş Birliği"] },
  { id: "inspiration", label: "İlham", tags: ["İlham"] },
  { id: "other", label: "Diğer", tags: [] },
];

const NAMED_TAGS = CATEGORY_FILTERS.flatMap((filter) => filter.tags);

export function filterMessages(
  messages: ThanksMessage[],
  filterId: string,
): ThanksMessage[] {
  if (filterId === "all") return messages;

  if (filterId === "other") {
    return messages.filter(
      (message) => !NAMED_TAGS.includes(message.category_tag),
    );
  }

  const filter = CATEGORY_FILTERS.find((item) => item.id === filterId);
  if (!filter) return messages;

  return messages.filter((message) => filter.tags.includes(message.category_tag));
}
