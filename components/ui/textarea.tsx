import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-32 w-full resize-none rounded-xl border border-violet-200 bg-white p-4 text-base text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-rose-400 aria-invalid:focus-visible:ring-rose-200",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
