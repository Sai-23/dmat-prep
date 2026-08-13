import type { UserRole } from "@/types/auth";
import type { Question, QuestionOption } from "@/types/questions";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type DatabaseTable<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: DatabaseTable<{
        id: string;
        display_name: string | null;
        full_name: string | null;
        avatar_path: string | null;
        target_exam_date: string | null;
        theme_preference: "light" | "dark" | "system";
        timezone: string;
        created_at: string;
        updated_at: string;
      }>;
      user_roles: DatabaseTable<{
        id: string;
        user_id: string;
        role: UserRole;
        created_at: string;
        updated_at: string;
      }>;
      questions: DatabaseTable<
        Question & {
          deleted_at?: string | null;
          deleted_by?: string | null;
          metadata?: Json;
          structuredData?: Json;
        }
      >;
      question_options: DatabaseTable<
        QuestionOption & {
          questionId: string;
          sortOrder: number;
        }
      >;
      tests: DatabaseTable<{
        id: string;
        title: string;
        test_type: "diagnostic" | "mini_mock" | "full_mock" | "sectional";
        duration_seconds: number;
        is_published: boolean;
      }>;
      test_attempts: DatabaseTable<{
        id: string;
        test_id: string;
        user_id: string;
        status: "in_progress" | "submitted" | "auto_submitted" | "abandoned";
        started_at: string;
        submitted_at: string | null;
        total_time_seconds: number;
        score: number | null;
        accuracy: number | null;
      }>;
      bookmarks: DatabaseTable<{
        id: string;
        user_id: string;
        question_id: string;
        created_at: string;
        updated_at: string;
      }>;
      user_topic_performance: DatabaseTable<{
        id: string;
        user_id: string;
        module: "core" | "computer_science";
        topic: string;
        subtopic: string;
        attempts_count: number;
        correct_count: number;
        incorrect_count: number;
        unanswered_count: number;
        average_response_time_seconds: number | null;
        accuracy: number | null;
        last_practiced_at: string | null;
      }>;
      study_plans: DatabaseTable<{
        id: string;
        user_id: string;
        plan_date: string;
        status: "draft" | "active" | "completed" | "archived";
      }>;
      study_tasks: DatabaseTable<{
        id: string;
        study_plan_id: string;
        title: string;
        description: string | null;
        topic: string | null;
        target_count: number | null;
        status: "pending" | "in_progress" | "completed" | "skipped";
        due_at: string | null;
        sort_order: number;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
