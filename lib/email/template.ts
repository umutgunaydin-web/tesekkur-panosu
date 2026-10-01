export type RejectionEmailInput = {
  senderName: string;
  recipientName: string;
  category: string;
  message: string;
  moderationReason: string;
  moderationConfidence: number;
};

export function buildRejectionEmail(input: RejectionEmailInput): {
  subject: string;
  text: string;
} {
  return {
    subject: "Teşekkür Panosu – İçerik Moderasyon Bildirimi",
    text: [
      "Merhaba,",
      "",
      "Teşekkür Panosu üzerinden gönderilen aşağıdaki mesaj otomatik içerik moderasyonu sonucunda yayına alınmamıştır.",
      "",
      `Gönderen: ${input.senderName}`,
      `Alıcı: ${input.recipientName}`,
      `Kategori: ${input.category}`,
      `Mesaj: "${input.message}"`,
      "",
      "Moderasyon nedeni:",
      input.moderationReason,
      "",
      "Güven skoru:",
      input.moderationConfidence.toFixed(2),
      "",
      "Mesaj Teşekkür Panosu'nda yayınlanmamıştır.",
      "",
      "Teşekkürler,",
      "Teşekkür Panosu AI Moderatörü",
    ].join("\n"),
  };
}

export type RecipientEmailInput = {
  recipientName: string;
  senderName: string;
  category: string;
  message: string;
  wallUrl: string;
};

export function buildRecipientEmail(input: RecipientEmailInput): {
  subject: string;
  text: string;
} {
  const firstName = input.recipientName.trim().split(/\s+/)[0] ?? input.recipientName;

  return {
    subject: `${input.senderName} sana bir teşekkür bıraktı 💜`,
    text: [
      `Merhaba ${firstName},`,
      "",
      `${input.senderName}, Teşekkür Panosu'nda sana bir mesaj bıraktı:`,
      "",
      `"${input.message}"`,
      `#${input.category}`,
      "",
      "Mesajın şu an ofisteki ekranda yayında. Panodaki diğer teşekkürleri görmek ve tepki bırakmak için:",
      input.wallUrl,
      "",
      "Sevgiler,",
      "AloTech Teşekkür Panosu",
    ].join("\n"),
  };
}
