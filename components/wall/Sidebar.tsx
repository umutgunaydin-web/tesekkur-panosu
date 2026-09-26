import { Heart, Star, Users } from "lucide-react";

import { AloTechLogo } from "@/components/wall/AloTechLogo";
import { QrCard } from "@/components/wall/QrCard";

type SidebarProps = {
  submitUrl: string;
  adminHref?: string | null;
};

const ACTIONS = [
  { icon: Users, label: "Destek ol" },
  { icon: Heart, label: "Takdir et" },
  { icon: Star, label: "İlham ver" },
];

export function Sidebar({ submitUrl, adminHref }: SidebarProps) {
  return (
    <aside className="flex h-full flex-col justify-between rounded-r-[38px] bg-brand-900 px-[clamp(16px,1.2vw,24px)] py-[clamp(18px,1.6vw,30px)] text-white">
      <div>
        <AloTechLogo
          tone="light"
          className="leading-none [font-size:clamp(26px,2.15vw,44px)]"
        />
        <p
          className="mt-[clamp(6px,0.5vw,10px)] leading-snug font-medium text-white/70"
          style={{ fontSize: "clamp(12px, 0.8vw, 16px)" }}
        >
          Daha iyi bir gelecek,
          <br />
          birlikte mümkün.
        </p>
      </div>

      <QrCard submitUrl={submitUrl} />

      <ul className="space-y-[clamp(10px,0.9vw,18px)]">
        {ACTIONS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3">
            <span className="flex size-[clamp(34px,2.4vw,46px)] items-center justify-center rounded-full bg-brand-700">
              <Icon className="size-[clamp(16px,1.15vw,22px)]" strokeWidth={2.2} />
            </span>
            <span
              className="font-semibold"
              style={{ fontSize: "clamp(14px, 0.95vw, 19px)" }}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>

      <div>
        <p
          className="font-hand leading-[1.15] text-white/90"
          style={{ fontSize: "clamp(18px, 1.35vw, 27px)" }}
        >
          Küçük teşekkürler,
          <br />
          büyük bir ekip yaratır. ♡
        </p>

        <div className="mt-[clamp(10px,0.9vw,18px)] flex items-baseline gap-2 whitespace-nowrap">
          <AloTechLogo
            tone="light"
            className="[font-size:clamp(13px,0.92vw,19px)]"
          />
          <span
            className="text-white/55"
            style={{ fontSize: "clamp(9px, 0.62vw, 13px)" }}
          >
            İnsan odaklı teknoloji.
          </span>
        </div>
        {adminHref ? (
          <a
            href={adminHref}
            className="mt-3 inline-block text-xs font-semibold text-white/80 underline"
          >
            Admin Paneli
          </a>
        ) : null}
      </div>
    </aside>
  );
}
