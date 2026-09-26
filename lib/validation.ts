import { z } from "zod";

import { CATEGORIES, MAX_MESSAGE_LENGTH } from "@/lib/types";

export const thanksFormSchema = z
  .object({
    sender: z.string().trim().max(60, "Ad en fazla 60 karakter olabilir."),
    is_anonymous: z.boolean(),
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
  })
  .superRefine((values, ctx) => {
    if (values.is_anonymous || values.sender.length >= 2) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sender"],
      message: "Adın en az 2 karakter olmalı.",
    });
  });

export type ThanksFormValues = z.infer<typeof thanksFormSchema>;
