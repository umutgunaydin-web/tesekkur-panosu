"use client";

import { QRCodeSVG } from "qrcode.react";

type QrCardProps = {
  submitUrl: string;
};

export function QrCard({ submitUrl }: QrCardProps) {
  return (
    <div className="rounded-[26px] bg-white p-[clamp(14px,1vw,20px)] shadow-[0_18px_44px_-28px_rgba(15,5,40,0.8)]">
      <p
        className="text-center leading-tight font-extrabold text-brand-900"
        style={{ fontSize: "clamp(16px, 1.15vw, 23px)" }}
      >
        Sen de
        <br />
        teşekkürünü bırak! 💜
      </p>

      <div className="mt-[clamp(10px,0.8vw,16px)] rounded-2xl border-[3px] border-brand-100 p-[clamp(8px,0.6vw,12px)]">
        <QRCodeSVG
          value={submitUrl}
          level="M"
          bgColor="#ffffff"
          fgColor="#260C4D"
          className="h-auto w-full"
          style={{ width: "100%", height: "auto" }}
          size={256}
        />
      </div>

      <div className="mt-[clamp(10px,0.8vw,16px)] flex items-center gap-2 rounded-2xl bg-[#FBC93D] px-3 py-[clamp(8px,0.6vw,12px)]">
        <span aria-hidden style={{ fontSize: "clamp(16px, 1.2vw, 24px)" }}>
          📱
        </span>
        <p
          className="leading-tight font-bold text-[#4A3305]"
          style={{ fontSize: "clamp(12px, 0.85vw, 17px)" }}
        >
          Tara → 30 saniyede
          <br />
          teşekkürünü paylaş.
        </p>
      </div>
    </div>
  );
}
