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
