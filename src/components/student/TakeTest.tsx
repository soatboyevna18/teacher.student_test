import { useState, useEffect, useCallback } from 'react';
import { supabase, type Test, type Question, type TestAnswer } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Clock, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

type Props = {
  test: Test;
  onComplete: () => void;
};

export default function TakeTest({ test, onComplete }: Props) {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [timeLeft, setTimeLeft] = useState(test.time_limit_minutes * 60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    fetchQuestions();
  }, [test.id]);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', test.id)
      .order('order_index');
    if (data) {
      setQuestions(data);
      setTotalPoints(data.reduce((sum, q) => sum + q.points, 0));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (finished || loading) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, loading]);

  const handleSubmit = useCallback(async () => {
    if (submitting || finished) return;
    setSubmitting(true);

    try {
      const { data: participant } = await supabase
        .from('test_participants')
        .select('id')
        .eq('test_id', test.id)
        .eq('student_id', profile!.id)
        .maybeSingle();

      if (!participant) { setSubmitting(false); return; }

      let correctCount = 0;
      let earnedPoints = 0;
      const answerInserts: Omit<TestAnswer, 'id'>[] = [];

      for (const q of questions) {
        const selected = answers[q.id];
        const isCorrect = selected === q.correct_answer;
        if (isCorrect) {
          correctCount++;
          earnedPoints += q.points;
        }
        if (selected) {
          answerInserts.push({
            participant_id: participant.id,
            question_id: q.id,
            selected_answer: selected,
            is_correct: isCorrect,
            answered_at: new Date().toISOString(),
          });
        }
      }

      if (answerInserts.length > 0) {
        await supabase.from('test_answers').insert(answerInserts);
      }

      await supabase.from('test_participants').update({
        status: 'completed',
        score: earnedPoints,
        completed_at: new Date().toISOString(),
      }).eq('id', participant.id);

      setScore(earnedPoints);
      setFinished(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [answers, questions, test.id, profile, submitting, finished]);

  function selectAnswer(questionId: string, answer: 'A' | 'B' | 'C' | 'D') {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Yuklanmoqda...</div>;
  }

  if (finished) {
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-slate-100 shadow-xl">
          <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
            percentage >= 70 ? 'bg-emerald-50' : percentage >= 40 ? 'bg-amber-50' : 'bg-red-50'
          }`}>
            <CheckCircle className={`w-10 h-10 ${percentage >= 70 ? 'text-emerald-500' : percentage >= 40 ? 'text-amber-500' : 'text-red-500'}`} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Test tugadi!</h2>
          <p className="text-slate-500 mb-6">{test.title}</p>
          <div className="bg-slate-50 rounded-2xl p-6 mb-6">
            <p className="text-4xl font-bold text-slate-900 mb-1">{score}/{totalPoints}</p>
            <p className="text-sm text-slate-500">Olingan ball / Jami ball</p>
            <div className="mt-4 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  percentage >= 70 ? 'bg-emerald-500' : percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-sm font-semibold mt-2 text-slate-600">{percentage}%</p>
          </div>
          <button
            onClick={onComplete}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25"
          >
            Panelga qaytish
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQ];
  if (!question) return null;
  const answeredCount = Object.keys(answers).length;
  const timeWarning = timeLeft < 60;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <h1 className="font-semibold text-slate-900 truncate">{test.title}</h1>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm ${
              timeWarning ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'
            }`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
          <div className="flex items-center gap-1 pb-3">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i === currentQ ? 'bg-blue-500' :
                  answers[questions[i].id] ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-semibold text-blue-600">Savol {currentQ + 1}/{questions.length}</span>
            <span className="text-sm text-slate-400">{question.points} ball</span>
          </div>

          <h2 className="text-lg font-semibold text-slate-900 mb-6">{question.question_text}</h2>

          <div className="space-y-3">
            {(['A', 'B', 'C', 'D'] as const).map(letter => {
              const optionText = question[`option_${letter.toLowerCase()}` as keyof Question] as string;
              const isSelected = answers[question.id] === letter;
              return (
                <button
                  key={letter}
                  onClick={() => selectAnswer(question.id, letter)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {letter}
                  </span>
                  <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                    {optionText}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Oldingi
            </button>

            {currentQ === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {submitting ? 'Yuborilmoqda...' : 'Testni yakunlash'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25"
              >
                Keyingi
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-slate-400">
          {answeredCount}/{questions.length} savol javob berildi
        </div>
      </main>
    </div>
  );
}
