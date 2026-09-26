"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Send } from "lucide-react";

import { EmployeePicker } from "@/components/form/EmployeePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitThanksMessage } from "@/app/gonder/actions";
import { CATEGORIES, MAX_MESSAGE_LENGTH, type EmployeePublic } from "@/lib/types";
import { cn } from "@/lib/utils";
import { thanksFormSchema, type ThanksFormValues } from "@/lib/validation";

const MESSAGE_COMFORT_LENGTH = 150;

const DEFAULT_VALUES: ThanksFormValues = {
  sender: "",
  is_anonymous: false,
  recipient_employee_id: "",
  category_tag: "Destek",
  message: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-1.5 text-sm font-medium text-rose-600">{message}</p>;
}

function SuccessPanel({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex flex-col items-center gap-5 rounded-3xl bg-white p-10 text-center shadow-sm"
    >
      <CheckCircle2 className="size-16 text-emerald-500" strokeWidth={1.8} />
      <div>
        <h2 className="text-balance text-xl font-extrabold text-brand-900">
          Teşekkürün alındı 💜 Kısa bir kontrolden sonra panoda yerini alacak.
        </h2>
      </div>
      <Button size="lg" variant="outline" onClick={onReset} className="w-full">
        Yeni teşekkür gönder
      </Button>
    </motion.div>
  );
}

export function SubmitForm({ employees }: { employees: EmployeePublic[] }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ThanksFormValues>({
    resolver: zodResolver(thanksFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onSubmit",
  });

  const messageLength = watch("message").length;
  const isAnonymous = watch("is_anonymous");

  const onSubmit = handleSubmit((values) => {
    setServerError(null);

    startTransition(async () => {
      const result = await submitThanksMessage(values);

      if (result.status === "error") {
        setServerError(result.message);
        return;
      }

      reset(DEFAULT_VALUES);
      setIsSubmitted(true);
    });
  });

  const handleReset = () => {
    setIsSubmitted(false);
    setServerError(null);
  };

  if (isSubmitted) {
    return (
      <AnimatePresence mode="wait">
        <SuccessPanel onReset={handleReset} />
      </AnimatePresence>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8"
    >
      <div>
        <Label htmlFor="recipient">Kime teşekkür etmek istiyorsun?</Label>
        <Controller
          control={control}
          name="recipient_employee_id"
          render={({ field }) => (
            <EmployeePicker
              employees={employees}
              value={field.value}
              onChange={field.onChange}
              invalid={Boolean(errors.recipient_employee_id)}
            />
          )}
        />
        <FieldError message={errors.recipient_employee_id?.message} />
      </div>

      <div>
        <Label htmlFor="message">Mesajın</Label>
        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <Textarea
              id="message"
              rows={4}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Neden teşekkür ettiğini birkaç cümleyle anlat..."
              aria-invalid={Boolean(errors.message)}
              className="mt-2 max-h-36 min-h-24"
              name={field.name}
              ref={field.ref}
              value={field.value}
              onBlur={field.onBlur}
              onChange={(event) =>
                field.onChange(event.target.value.slice(0, MAX_MESSAGE_LENGTH))
              }
            />
          )}
        />
        <p
          className={cn(
            "mt-1.5 text-xs font-medium",
            messageLength > MESSAGE_COMFORT_LENGTH
              ? "text-amber-700"
              : "text-slate-400",
          )}
        >
          {messageLength} / {MAX_MESSAGE_LENGTH}
        </p>
        {messageLength > MESSAGE_COMFORT_LENGTH ? (
          <p className="mt-1 text-sm text-amber-700">
            Mesajını biraz kısaltırsan panoda daha rahat okunur.
          </p>
        ) : null}
        <FieldError message={errors.message?.message} />
      </div>

      <div>
        <Label>Kategori</Label>
        <Controller
          control={control}
          name="category_tag"
          render={({ field }) => (
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const isSelected = field.value === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => field.onChange(category)}
                    aria-pressed={isSelected}
                    className={cn(
                      "rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors",
                      isSelected
                        ? "border-violet-700 bg-violet-700 text-white"
                        : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
                    )}
                  >
                    #{category}
                  </button>
                );
              })}
            </div>
          )}
        />
        <FieldError message={errors.category_tag?.message} />
      </div>

      <div>
        <Label htmlFor="sender">Adın</Label>
        <Input
          id="sender"
          autoComplete="name"
          placeholder={isAnonymous ? "Anonim olarak paylaşılacak" : "Örn. Elif Yılmaz"}
          disabled={isAnonymous}
          aria-invalid={Boolean(errors.sender)}
          className="mt-2"
          {...register("sender")}
        />
        <FieldError message={errors.sender?.message} />

        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            className="size-4 accent-violet-700"
            {...register("is_anonymous")}
          />
          Adımı gizle, anonim gönder
        </label>
      </div>

      {serverError ? (
        <p className="rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        <Send className="size-5" />
        {isPending ? "Gönderiliyor..." : "Teşekkürümü gönder"}
      </Button>
    </form>
  );
}
