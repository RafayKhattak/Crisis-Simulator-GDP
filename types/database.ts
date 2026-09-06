export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ScenarioRow = {
  id: string;
  title: string;
  description: string;
  starting_context: string;
  created_at: string;
};

export type CharacterRow = {
  id: string;
  scenario_id: string;
  name: string;
  email: string;
  role: string;
  system_prompt: string;
  created_at: string;
};

export type TraineeRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
};

export type MessageRow = {
  id: string;
  scenario_id: string;
  trainee_id: string;
  sender_email: string;
  receiver_email: string;
  content: string;
  created_at: string;
};

export type PlaybookChunkRow = {
  id: string;
  content: string;
  embedding: number[] | string | null;
  created_at: string;
};

export type PlaybookMatchRow = {
  id: string;
  content: string;
  similarity: number;
};

export type Database = {
  public: {
    Tables: {
      scenarios: {
        Row: ScenarioRow;
        Insert: {
          id?: string;
          title: string;
          description: string;
          starting_context: string;
          created_at?: string;
        };
        Update: Partial<ScenarioRow>;
        Relationships: [];
      };
      characters: {
        Row: CharacterRow;
        Insert: {
          id?: string;
          scenario_id: string;
          name: string;
          email: string;
          role: string;
          system_prompt: string;
          created_at?: string;
        };
        Update: Partial<CharacterRow>;
        Relationships: [
          {
            foreignKeyName: "characters_scenario_id_fkey";
            columns: ["scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["id"];
          },
        ];
      };
      trainees: {
        Row: TraineeRow;
        Insert: {
          id?: string;
          email: string;
          name: string;
          password_hash: string;
          created_at?: string;
        };
        Update: Partial<TraineeRow>;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: {
          id?: string;
          scenario_id: string;
          trainee_id: string;
          sender_email: string;
          receiver_email: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<MessageRow>;
        Relationships: [
          {
            foreignKeyName: "messages_scenario_id_fkey";
            columns: ["scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_trainee_id_fkey";
            columns: ["trainee_id"];
            isOneToOne: false;
            referencedRelation: "trainees";
            referencedColumns: ["id"];
          },
        ];
      };
      playbook_chunks: {
        Row: PlaybookChunkRow;
        Insert: {
          id?: string;
          content: string;
          embedding: number[] | string;
          created_at?: string;
        };
        Update: Partial<PlaybookChunkRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_playbook_chunks: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          match_threshold?: number;
        };
        Returns: PlaybookMatchRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
