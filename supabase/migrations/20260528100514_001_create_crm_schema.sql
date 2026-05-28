/*
  # Create CRM Schema for Teacher-Student Test Management System

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `role` (text: 'teacher' or 'student')
      - `created_at` (timestamp)
    - `tests`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `teacher_id` (uuid, references profiles)
      - `is_open` (boolean - whether students can freely join)
      - `time_limit_minutes` (integer)
      - `status` (text: 'draft', 'active', 'completed')
      - `created_at` (timestamp)
    - `questions`
      - `id` (uuid, primary key)
      - `test_id` (uuid, references tests)
      - `question_text` (text)
      - `option_a` (text)
      - `option_b` (text)
      - `option_c` (text)
      - `option_d` (text)
      - `correct_answer` (text: 'A', 'B', 'C', 'D')
      - `points` (integer, default 1)
      - `order_index` (integer)
    - `test_participants`
      - `id` (uuid, primary key)
      - `test_id` (uuid, references tests)
      - `student_id` (uuid, references profiles)
      - `status` (text: 'invited', 'accepted', 'rejected', 'completed')
      - `score` (integer, nullable)
      - `started_at` (timestamp, nullable)
      - `completed_at` (timestamp, nullable)
      - `created_at` (timestamp)
    - `test_answers`
      - `id` (uuid, primary key)
      - `participant_id` (uuid, references test_participants)
      - `question_id` (uuid, references questions)
      - `selected_answer` (text: 'A', 'B', 'C', 'D')
      - `is_correct` (boolean)
      - `answered_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Teachers can CRUD their own tests and questions
    - Teachers can manage participants for their tests
    - Students can view open tests and their own data
    - Students can only join tests they are invited to or that are open
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
  created_at timestamptz DEFAULT now()
);

-- Create tests table
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_open boolean DEFAULT false,
  time_limit_minutes integer DEFAULT 30,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  points integer DEFAULT 1,
  order_index integer DEFAULT 0
);

-- Create test_participants table
CREATE TABLE IF NOT EXISTS test_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'rejected', 'completed')),
  score integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(test_id, student_id)
);

-- Create test_answers table
CREATE TABLE IF NOT EXISTS test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES test_participants(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer text NOT NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct boolean NOT NULL DEFAULT false,
  answered_at timestamptz DEFAULT now(),
  UNIQUE(participant_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Tests policies
CREATE POLICY "Teachers can create own tests"
  ON tests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher');

CREATE POLICY "Teachers can update own tests"
  ON tests FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own tests"
  ON tests FOR DELETE
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Authenticated users can read tests"
  ON tests FOR SELECT
  TO authenticated
  USING (true);

-- Questions policies
CREATE POLICY "Teachers can manage own test questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.teacher_id = auth.uid()));

CREATE POLICY "Teachers can update own test questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.teacher_id = auth.uid()));

CREATE POLICY "Teachers can delete own test questions"
  ON questions FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.teacher_id = auth.uid()));

CREATE POLICY "Authenticated users can read questions"
  ON questions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.status IN ('active', 'completed')));

CREATE POLICY "Teachers can read their draft questions"
  ON questions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.teacher_id = auth.uid()));

-- Test participants policies
CREATE POLICY "Teachers can manage participants of own tests"
  ON test_participants FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tests WHERE tests.id = test_participants.test_id AND tests.teacher_id = auth.uid()));

CREATE POLICY "Teachers can update participants of own tests"
  ON test_participants FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = test_participants.test_id AND tests.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM tests WHERE tests.id = test_participants.test_id AND tests.teacher_id = auth.uid()));

CREATE POLICY "Teachers can delete participants of own tests"
  ON test_participants FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = test_participants.test_id AND tests.teacher_id = auth.uid()));

CREATE POLICY "Students can join open tests"
  ON test_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student' AND
    EXISTS (SELECT 1 FROM tests WHERE tests.id = test_participants.test_id AND tests.is_open = true AND tests.status = 'active')
  );

CREATE POLICY "Students can update own participation"
  ON test_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Authenticated users can read participants"
  ON test_participants FOR SELECT
  TO authenticated
  USING (true);

-- Test answers policies
CREATE POLICY "Students can insert own answers"
  ON test_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM test_participants WHERE test_participants.id = test_answers.participant_id AND test_participants.student_id = auth.uid())
  );

CREATE POLICY "Students can update own answers"
  ON test_answers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM test_participants WHERE test_participants.id = test_answers.participant_id AND test_participants.student_id = auth.uid())
  );

CREATE POLICY "Teachers can read answers for own tests"
  ON test_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM test_participants
      JOIN tests ON tests.id = test_participants.test_id
      WHERE test_participants.id = test_answers.participant_id AND tests.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read own answers"
  ON test_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM test_participants WHERE test_participants.id = test_answers.participant_id AND test_participants.student_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tests_teacher_id ON tests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_participants_test_id ON test_participants(test_id);
CREATE INDEX IF NOT EXISTS idx_test_participants_student_id ON test_participants(student_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_participant_id ON test_answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_question_id ON test_answers(question_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
