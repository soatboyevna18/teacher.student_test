import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string;
  role: 'teacher' | 'student';
  created_at: string;
};

export type Test = {
  id: string;
  title: string;
  description: string;
  teacher_id: string;
  is_open: boolean;
  time_limit_minutes: number;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  teacher?: Profile;
};

export type Question = {
  id: string;
  test_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
  order_index: number;
};

export type TestParticipant = {
  id: string;
  test_id: string;
  student_id: string;
  status: 'invited' | 'accepted' | 'rejected' | 'completed';
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  student?: Profile;
  test?: Test;
};

export type TestAnswer = {
  id: string;
  participant_id: string;
  question_id: string;
  selected_answer: 'A' | 'B' | 'C' | 'D';
  is_correct: boolean;
  answered_at: string;
};
