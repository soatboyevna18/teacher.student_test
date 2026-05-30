import { useState } from 'react';
import { supabase, type Test, type Question } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { X, Plus, Trash2, Save, GripVertical } from 'lucide-react';

type Props = {
  test: Test | null;
  onClose: () => void;
  onSaved: () => void;
};

type QuestionInput = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
};

export default function TestForm({ test, onClose, onSaved }: Props) {
  const { profile } = useAuth();
  const [title, setTitle] = useState(test?.title ?? '');
  const [description, setDescription] = useState(test?.description ?? '');
  const [isOpen, setIsOpen] = useState(test?.is_open ?? false);
  const [timeLimit, setTimeLimit] = useState(test?.time_limit_minutes ?? 30);
  const [questions, setQuestions] = useState<QuestionInput[]>([
    { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', points: 1 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!test;

  function addQuestion() {
    setQuestions([...questions, { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', points: 1 }]);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, field: keyof QuestionInput, value: string | number) {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  }

  async function handleSave() {
    if (!title.trim()) { setError('Test sarlavhasi kiritilishi shart'); return; }
    if (questions.some(q => !q.question_text.trim() || !q.option_a.trim() || !q.option_b.trim())) {
      setError("Savol matni va kamida 2 ta variant kiritilishi shart");
      return;
    }
    setError(null);
    setSaving(true);

    try {
      let testId = test?.id;

      if (isEditing) {
        await supabase.from('tests').update({
          title, description, is_open: isOpen, time_limit_minutes: timeLimit,
        }).eq('id', test.id);
      } else {
        const { data, error: insertError } = await supabase.from('tests').insert({
          title, description, is_open: isOpen, time_limit_minutes: timeLimit,
          teacher_id: profile!.id, status: 'draft',
        }).select().single();
        if (insertError) throw insertError;
        testId = data.id;
      }

      if (!isEditing) {
        const questionInserts = questions.map((q, i) => ({
          test_id: testId,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          points: q.points,
          order_index: i,
        }));
        const { error: qError } = await supabase.from('questions').insert(questionInserts);
        if (qError) throw qError;
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? 'Testni tahrirlash' : 'Yangi test yaratish'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Test Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sarlavha</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                placeholder="Test sarlavhasi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tavsif</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                placeholder="Test haqida qisqacha ma'lumot"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vaqt (daqiqa)</label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  min={1}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 w-full">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={(e) => setIsOpen(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Ochiq test (hamma qo'shila oladi)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Questions */}
          {!isEditing && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Savollar</h3>
                <button
                  onClick={addQuestion}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Savol qo'shish
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((q, index) => (
                  <div key={index} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">Savol {index + 1}</span>
                      </div>
                      {questions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(index)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <input
                      value={q.question_text}
                      onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none mb-3 bg-white"
                      placeholder="Savol matnini kiriting"
                    />

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {['A', 'B', 'C', 'D'].map(letter => {
                        const key = `option_${letter.toLowerCase()}` as keyof QuestionInput;
                        return (
                          <div key={letter} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuestion(index, 'correct_answer', letter)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-all ${
                                q.correct_answer === letter
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              {letter}
                            </button>
                            <input
                              value={q[key] as string}
                              onChange={(e) => updateQuestion(index, key, e.target.value)}
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                              placeholder={`${letter} variant`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500">Ball:</label>
                      <input
                        type="number"
                        value={q.points}
                        onChange={(e) => updateQuestion(index, 'points', Number(e.target.value))}
                        min={1}
                        className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/25"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}
