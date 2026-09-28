import type { Metadata } from "next";

import { SubmitForm } from "@/components/form/SubmitForm";
import { AloTechLogo } from "@/components/wall/AloTechLogo";
import { getActiveEmployees } from "@/lib/employees";

export const metadata: Metadata = {
  title: "Sen de teşekkürünü bırak! | AloTech",
  description: "Bir arkadaşına teşekkür et, mesajın ofis ekranında yayınlansın.",
};

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function SubmitPage() {
  const employees = await getActiveEmployees();

  return (
    <main className="min-h-screen bg-[#F5F2FB]">
      <header className="bg-brand-900 px-6 pt-10 pb-16 text-white sm:px-8">
        <div className="mx-auto max-w-lg">
          <AloTechLogo tone="light" className="text-xl" />

          <h1 className="mt-7 text-3xl leading-tight font-extrabold">
            Sen de teşekkürünü bırak! 💜
          </h1>
          <p className="mt-3 text-white/70">
            Yazdığın mesaj ofisteki Teşekkür Panosu ekranında anında görünecek.
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-10 max-w-lg px-4 pb-16 sm:px-8">
        <SubmitForm employees={employees} />
      </div>
    </main>
  );
}
