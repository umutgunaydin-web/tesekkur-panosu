import type { Metadata } from "next";
import Link from "next/link";

import { ReactionFeed } from "@/components/reactions/ReactionFeed";
import { AloTechLogo } from "@/components/wall/AloTechLogo";
import { getLatestMessages } from "@/lib/messages";
import { fetchReactionCounts } from "@/lib/reactions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Panodaki teşekkürler | AloTech",
  description: "Ofis ekranındaki teşekkürlere göz at, tepki bırak.",
};

export const dynamic = "force-dynamic";

export default async function ReactionPage() {
  const messages = await getLatestMessages();
  const counts = isSupabaseConfigured()
    ? await fetchReactionCounts(
        getSupabaseServerClient(),
        messages.map((message) => message.id),
      )
    : {};

  return (
    <main className="min-h-screen bg-[#F5F2FB]">
      <header className="bg-brand-900 px-6 pt-10 pb-16 text-white sm:px-8">
        <div className="mx-auto max-w-lg">
          <AloTechLogo tone="light" className="text-xl" />
          <h1 className="mt-7 text-3xl leading-tight font-extrabold">
            Panodaki teşekkürler 💜
          </h1>
          <p className="mt-3 text-white/70">
            Bir mesaja 👏 ya da 💜 bırak, ofis ekranında hemen görünsün.
          </p>
          <Link
            href="/gonder"
            className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-900"
          >
            Sen de teşekkür bırak →
          </Link>
        </div>
      </header>

      <div className="mx-auto -mt-10 max-w-lg px-4 pb-16 sm:px-8">
        <ReactionFeed messages={messages} initialCounts={counts} />
      </div>
    </main>
  );
}
