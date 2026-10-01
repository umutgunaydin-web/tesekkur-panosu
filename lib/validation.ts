import { z } from "zod";

import { ANONYMOUS_SENDER, CATEGORIES, MAX_MESSAGE_LENGTH } from "@/lib/types";

export const thanksFormSchema = z
  .object({
    sender: z
      .string()
      .trim()
      .min(2, "Adın en az 2 karakter olmalı.")
      .max(60, "Ad en fazla 60 karakter olabilir.")
      .refine(
        (value) => value.toLocaleLowerCase("tr-TR") !== ANONYMOUS_SENDER.toLocaleLowerCase("tr-TR"),
        "Teşekkürler isimle paylaşılır, lütfen adını yaz.",
      ),
    recipient_employee_id: z
      .string()
      .uuid("Lütfen listeden bir çalışan seç."),
    category_tag: z.enum(CATEGORIES, {
      errorMap: () => ({ message: "Bir kategori seç." }),
    }),
    message: z
      .string()
      .trim()
      .min(10, "Mesajın en az 10 karakter olmalı.")
      .max(
        MAX_MESSAGE_LENGTH,
        `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`,
      ),
  });

export type ThanksFormValues = z.infer<typeof thanksFormSchema>;
