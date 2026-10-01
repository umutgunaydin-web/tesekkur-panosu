export const COLOR_THEMES = [
  "pink",
  "green",
  "blue",
  "yellow",
  "purple",
  "rose",
] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number];

export const CATEGORIES = [
  "İş Birliği",
  "Destek",
  "İlham",
  "Ekip Ruhu",
  "Müşteri Odağı",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** QR formunun ve panonun çalışandan gördüğü alanlar. */
export type EmployeePublic = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
};

export type Employee = EmployeePublic & {
  is_active: boolean;
  source: string;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
};

export type ThanksMessage = {
  id: string;
  message: string;
  sender: string;
  /** Eski serbest metin kayıtları için yedek ad. Yeni kayıtlarda çalışan adı. */
  receiver: string;
  recipient_employee_id: string | null;
  /** Çalışan dizininden gelen güncel ad, e-posta ve avatar. */
  recipient: EmployeePublic | null;
  category_tag: string;
  color_theme: ColorTheme;
  created_at: string;
};

export type ThanksMessageInsert = {
  message: string;
  sender: string;
  receiver: string;
  recipient_employee_id: string;
  category_tag: string;
  color_theme: ColorTheme;
};

export const MODERATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "removed",
  "moderation_error",
] as const;

export const ADMIN_ROLES = ["admin", "administrative_affairs_manager"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
export type ProfileRole = "user" | AdminRole;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export type ThanksModerationUpdate = {
  status?: ModerationStatus;
  moderation_decision?: "APPROVE" | "REJECT" | null;
  moderation_reason?: string | null;
  moderation_confidence?: number | null;
  moderated_at?: string | null;
  published_at?: string | null;
  rejection_email_sent_at?: string | null;
  removed_at?: string | null;
  removed_by?: string | null;
  remove_reason?: string | null;
  moderation_provider?: ModerationProvider | null;
  recipient_email_sent_at?: string | null;
};

export type ModerationProvider = "claude" | "gemini" | "local";

export const REACTION_KINDS = ["clap", "heart"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export type ReactionCounts = { clap: number; heart: number };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: ProfileRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: ProfileRole;
          created_at?: string;
        };
        Update: { role?: ProfileRole; email?: string };
        Relationships: [];
      };
      wall_signals: {
        Row: {
          id: number;
          recognition_id: string;
          visible: boolean;
          created_at: string;
        };
        Insert: {
          recognition_id: string;
          visible: boolean;
          id?: number;
          created_at?: string;
        };
        Update: { visible?: boolean };
        Relationships: [];
      };
      recognition_admin_actions: {
        Row: {
          id: string;
          recognition_id: string;
          admin_user_id: string;
          action: "REMOVE" | "RESTORE" | "PUBLISH";
          reason: string | null;
          created_at: string;
        };
        Insert: {
          recognition_id: string;
          admin_user_id: string;
          action: "REMOVE" | "RESTORE" | "PUBLISH";
          reason?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: { reason?: string | null };
        Relationships: [];
      };
      employees: {
        Row: Employee;
        Insert: {
          name: string;
          email: string;
          avatar_url?: string | null;
          is_active?: boolean;
          source?: string;
          id?: string;
          created_at?: string;
          updated_at?: string;
          last_synced_at?: string | null;
        };
        Update: Partial<Employee>;
        Relationships: [];
      };
      recognition_reactions: {
        Row: {
          recognition_id: string;
          device_id: string;
          kind: ReactionKind;
          client_hash: string | null;
          created_at: string;
        };
        Insert: {
          recognition_id: string;
          device_id: string;
          kind: ReactionKind;
          client_hash?: string | null;
          created_at?: string;
        };
        Update: { client_hash?: string | null };
        Relationships: [];
      };
      reaction_counts: {
        Row: {
          recognition_id: string;
          clap: number;
          heart: number;
          updated_at: string;
        };
        Insert: {
          recognition_id: string;
          clap?: number;
          heart?: number;
          updated_at?: string;
        };
        Update: { clap?: number; heart?: number; updated_at?: string };
        Relationships: [];
      };
      thanks_messages: {
        Row: {
          id: string;
          message: string;
          sender: string;
          receiver: string;
          receiver_email: string | null;
          receiver_avatar_url: string | null;
          recipient_employee_id: string | null;
          category_tag: string;
          color_theme: ColorTheme;
          created_at: string;
          status: ModerationStatus;
          moderation_decision: "APPROVE" | "REJECT" | null;
          moderation_reason: string | null;
          moderation_confidence: number | null;
          moderated_at: string | null;
          published_at: string | null;
          rejection_email_sent_at: string | null;
          removed_at: string | null;
          removed_by: string | null;
          remove_reason: string | null;
          client_hash: string | null;
          moderation_provider: ModerationProvider | null;
          recipient_email_sent_at: string | null;
        };
        Insert: ThanksMessageInsert & {
          id?: string;
          created_at?: string;
          client_hash?: string | null;
          status?: ModerationStatus;
          receiver_email?: string | null;
          receiver_avatar_url?: string | null;
        };
        Update: ThanksModerationUpdate;
        Relationships: [
          {
            foreignKeyName: "thanks_messages_recipient_employee_id_fkey";
            columns: ["recipient_employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

/** Yeni teşekkür metninin üst sınırı. Eski kayıtlar bundan uzun olabilir. */
export const MAX_MESSAGE_LENGTH = 180;

/** TV ekranında bellekte tutulan maksimum mesaj sayısı. */
export const MAX_VISIBLE_MESSAGES = 30;

/** Referans tasarımdaki 3 sütun x 2 satır yerleşimi. */
export const CARDS_PER_PAGE = 6;

/** Eski anonim kayıtların gönderen adı. Yeni gönderimde bu ad kabul edilmez. */
export const ANONYMOUS_SENDER = "Anonim";
