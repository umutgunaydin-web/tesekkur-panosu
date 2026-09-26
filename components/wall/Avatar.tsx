"use client";

import { useEffect, useState } from "react";

import { getInitials } from "@/lib/turkish";
import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  ringClassName?: string;
};

const INITIAL_PALETTE = [
  "bg-[#E7D8FA] text-[#4B2A8C]",
  "bg-[#FBD9E5] text-[#8F2B54]",
  "bg-[#D5EAF8] text-[#1F4E7A]",
  "bg-[#D6F0E1] text-[#1E6B4A]",
  "bg-[#FBEAC2] text-[#7A5A12]",
];

function paletteFor(name: string): string {
  const seed = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);

  return INITIAL_PALETTE[seed % INITIAL_PALETTE.length];
}

function Initials({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center justify-center font-extrabold",
        paletteFor(name),
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}

/**
 * Çalışan fotoğrafı varsa dairesel görsel, yoksa veya adres bozulursa
 * baş harf rozeti gösterir. Stok fotoğraf kullanılmaz.
 */
export function Avatar({
  name,
  avatarUrl,
  className,
  ringClassName,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  const shared = cn(
    "shrink-0 overflow-hidden rounded-full ring-4 ring-white/80",
    ringClassName,
    className,
  );

  if (!avatarUrl || failed) {
    return <Initials name={name} className={shared} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- avatarlar Kolay İK S3 adresinden gelir
    <img
      src={avatarUrl}
      alt=""
      onError={() => setFailed(true)}
      className={cn(shared, "object-cover")}
    />
  );
}
