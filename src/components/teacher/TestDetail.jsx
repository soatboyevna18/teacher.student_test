import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Users, Plus, UserPlus, X, Check, Clock, BookOpen, BarChart3 } from 'lucide-react';

export default function TestDetail({ test, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDetails();
  }, [test.id]);

  async function fetchDetails() {
    const [qRes, pRes] = await Promise.all([
      supabase.from('questions').select('*').eq('test_id', test.id).order('order_index'),
      supabase.from('test_participants').select('*, student:profiles(*)').eq('test_id', test.id),
    ]);
    if (qRes.data) setQuestions(qRes.data);
    if (pRes.data) setParticipants(pRes.data);
    setLoading(false);
  }

  async function fetchStudents() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .ilike('full_name', `%${searchQuery}%`);
    if (data) setStudents(data);
  }

  async function addParticipant(studentId) {
    await supabase.from('test_participants').insert({
      test_id: test.id,
      student_id: studentId,
      status: 'invited',
    });
    fetchDetails();
    setShowAddStudent(false);
  }

  async function removeParticipant(participantId) {
    await supabase.from('test_participants').delete().eq('id', participantId);
    fetchDetails();
  }

  async function updateParticipantStatus(participantId, status) {
    await supabase.from('test_participants').update({ status }).eq('id', participantId);
    fetchDetails();
  }

  const avgScore = participants.filter(p => p.score !== null).length > 0
    ? Math.round(participants.filter(p => p.score !== null).reduce((sum, p) => sum + (p.score ?? 0), 0) / participants.filter(p => p.score !== null).length)
    : null;

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14 sm:h-16">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">{test.title}</h1>
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center px-2 py-0.5 rounded font-semibold ${
                  test.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                  test.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                  'bg-amber-50 text-amber-700'
                }`}>
                  {test.status === 'active' ? 'Faol' : test.status === 'completed' ? 'Tugallangan' : 'Qoralama'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Yuklanmoqda...</div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-4 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Savollar</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900">{questions.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-4 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Ishtirokchilar</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900">{participants.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-4 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">O'rtacha</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900">{avgScore ?? '-'}/{totalPoints}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-4 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Vaqt</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900">{test.time_limit_minutes}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg sm:rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between p-3 sm:p-5 border-b border-slate-100 gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Ishtirokchilar</h2>
                  <button
                    onClick={() => { setShowAddStudent(true); fetchStudents(); }}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-xs sm:text-sm transition-colors flex-shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Qo'shish</span>
                  </button>
                </div>
                {participants.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center">
                    <Users className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 mx-auto mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-slate-400">Ishtirokchi yo'q</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                    {participants.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50/50 transition-colors gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-slate-600">
                              {p.student?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 text-xs sm:text-sm truncate">{p.student?.full_name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                p.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                p.status === 'accepted' ? 'bg-blue-50 text-blue-700' :
                                p.status === 'invited' ? 'bg-amber-50 text-amber-700' :
                                'bg-red-50 text-red-700'
                              }`}>
                                {p.status === 'completed' ? 'Tugallangan' :
                                 p.status === 'accepted' ? 'Qabul' :
                                 p.status === 'invited' ? 'Taklif' : 'Rad'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {p.status === 'invited' && (
                            <button
                              onClick={() => updateParticipantStatus(p.id, 'accepted')}
                              className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => removeParticipant(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg sm:rounded-2xl border border-slate-100 shadow-sm">
                <div className="p-3 sm:p-5 border-b border-slate-100">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Savollar</h2>
                </div>
                {questions.length === 0 ? (
                  <div className="p-6 text-center">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm text-slate-400">Savollar yo'q</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                    {questions.map((q, i) => (
                      <div key={q.id} className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-blue-600">{i + 1}</span>
                          <span className="text-xs text-slate-400">{q.points}b</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 font-medium mb-1">{q.question_text}</p>
                        <div className="space-y-0.5">
                          {['A', 'B', 'C', 'D'].map(letter => (
                            <div key={letter} className={`text-xs px-1.5 py-0.5 rounded ${
                              q.correct_answer === letter ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-500'
                            }`}>
                              {letter}. {q[`option_${letter.toLowerCase()}`]}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showAddStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">O'quvchi qo'shish</h3>
              <button onClick={() => setShowAddStudent(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); fetchStudents(); }}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all mb-4 text-sm"
                placeholder="Qidirish..."
              />
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {students
                  .filter(s => !participants.some(p => p.student_id === s.id))
                  .map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2.5 sm:py-3">
                      <span className="font-medium text-slate-900 text-xs sm:text-sm truncate">{s.full_name}</span>
                      <button
                        onClick={() => addParticipant(s.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-xs transition-colors flex-shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
