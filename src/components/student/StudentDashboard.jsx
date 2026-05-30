import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { BookOpen, Clock, Play, GraduationCap, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import TakeTest from './TakeTest';

export default function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTests, setActiveTests] = useState([]);
  const [myParticipations, setMyParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinError, setJoinError] = useState(null);
  const [activeTest, setActiveTest] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [testsRes, partsRes] = await Promise.all([
      supabase.from('tests').select('*, teacher:profiles!tests_teacher_id_fkey(full_name)').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('test_participants').select('*, test:tests(*)').eq('student_id', profile.id).order('created_at', { ascending: false }),
    ]);
    if (testsRes.data) setActiveTests(testsRes.data);
    if (partsRes.data) setMyParticipations(partsRes.data);
    setLoading(false);
  }

  async function joinTest(testId) {
    setJoinError(null);
    const test = activeTests.find(t => t.id === testId);
    if (!test) return;

    const existingParticipation = myParticipations.find(p => p.test_id === testId);

    if (existingParticipation) {
      if (existingParticipation.status === 'rejected') {
        setJoinError("Siz bu testga qo'shila olmaysiz.");
        return;
      }
      if (existingParticipation.status === 'invited' || existingParticipation.status === 'accepted') {
        setJoinError("Siz bu testga allaqachon qo'shilgansiz.");
        return;
      }
      return;
    }

    if (!test.is_open) {
      const { data: participant } = await supabase
        .from('test_participants')
        .select('*')
        .eq('test_id', testId)
        .eq('student_id', profile.id)
        .maybeSingle();

      if (!participant) {
        setJoinError("O'qituvchi sizni taklif qilmagan.");
        return;
      }
    }

    const { error } = await supabase.from('test_participants').insert({
      test_id: testId,
      student_id: profile.id,
      status: test.is_open ? 'accepted' : 'invited',
    });

    if (error) {
      setJoinError("Xatolik yuz berdi. Qayta urinib ko'ring.");
      return;
    }

    fetchData();
  }

  async function startTest(participation) {
    if (!participation.test) return;

    if (participation.status === 'rejected') {
      setJoinError("Siz bu testga qo'shila olmaysiz.");
      return;
    }

    if (participation.status === 'invited') {
      setJoinError("O'qituvchi sizni tasdiqlamagan.");
      return;
    }

    if (participation.status === 'completed') {
      setJoinError("Siz bu testni allaqachon topshirgansiz.");
      return;
    }

    await supabase.from('test_participants').update({
      started_at: new Date().toISOString(),
    }).eq('id', participation.id);

    setActiveTest(participation.test);
  }

  if (activeTest) {
    return <TakeTest test={activeTest} onComplete={() => { setActiveTest(null); fetchData(); }} />;
  }

  const myTestIds = new Set(myParticipations.map(p => p.test_id));
  const completedTests = myParticipations.filter(p => p.status === 'completed');
  const pendingTests = myParticipations.filter(p => p.status === 'invited' || p.status === 'accepted');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900">EduCRM</h1>
                <p className="text-xs text-slate-500 hidden sm:block">O'quvchi paneli</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="text-xs sm:text-sm text-slate-500 hover:text-red-600 transition-colors font-medium"
            >
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {joinError && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-100 rounded-lg sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2 animate-in">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-red-700 flex-1">{joinError}</p>
            <button onClick={() => setJoinError(null)} className="text-red-400 hover:text-red-600 font-bold flex-shrink-0">×</button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{pendingTests.length}</p>
                <p className="text-xs text-slate-500">Kutilmoqda</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{completedTests.length}</p>
                <p className="text-xs text-slate-500">Tugallangan</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-900">
                  {completedTests.length > 0 ? Math.round(completedTests.reduce((s, p) => s + (p.score ?? 0), 0) / completedTests.length) : '-'}
                </p>
                <p className="text-xs text-slate-500">O'rtacha</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Yuklanmoqda...</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">Mavjud testlar</h2>
              {activeTests.filter(t => !myTestIds.has(t.id)).length === 0 ? (
                <div className="bg-white rounded-lg sm:rounded-2xl p-6 sm:p-8 text-center border border-slate-100">
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 mx-auto mb-2 sm:mb-3" />
                  <p className="text-xs sm:text-sm text-slate-400">Mavjud test yo'q</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {activeTests.filter(t => !myTestIds.has(t.id)).map(test => (
                    <div key={test.id} className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{test.title}</h3>
                          {test.description && <p className="text-xs sm:text-sm text-slate-500 truncate mt-1">{test.description}</p>}
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            {test.time_limit_minutes} daq
                            {test.is_open && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-semibold">Ochiq</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => joinTest(test.id)}
                          className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 flex-shrink-0"
                        >
                          <Play className="w-4 h-4" />
                          Qo'shilish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">Mening testlarim</h2>
              {myParticipations.length === 0 ? (
                <div className="bg-white rounded-lg sm:rounded-2xl p-6 sm:p-8 text-center border border-slate-100">
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 mx-auto mb-2 sm:mb-3" />
                  <p className="text-xs sm:text-sm text-slate-400">Hali qo'shilmagansiz</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {myParticipations.map(p => (
                    <div key={p.id} className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{p.test?.title}</h3>
                            <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                              p.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                              p.status === 'accepted' ? 'bg-blue-50 text-blue-700' :
                              p.status === 'invited' ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {p.status === 'completed' ? 'Tugallangan' :
                               p.status === 'accepted' ? 'Tasdiqlangan' :
                               p.status === 'invited' ? 'Kutilmoqda' : 'Rad etilgan'}
                            </span>
                          </div>
                          {p.score !== null && (
                            <p className="text-xs sm:text-sm text-slate-600 font-medium">Ball: {p.score}</p>
                          )}
                        </div>
                        {p.status === 'accepted' && (
                          <button
                            onClick={() => startTest(p)}
                            className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/25 flex-shrink-0"
                          >
                            <Play className="w-4 h-4" />
                            <span className="hidden sm:inline">Boshlash</span>
                            <span className="sm:hidden">Boshlash</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
