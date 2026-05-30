import { useState, useEffect } from 'react';
import { supabase, type Test, type TestParticipant } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { BookOpen, Users, Clock, Play, GraduationCap, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import TakeTest from './TakeTest';

export default function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTests, setActiveTests] = useState<(Test & { teacher?: { full_name: string } })[]>([]);
  const [myParticipations, setMyParticipations] = useState<(TestParticipant & { test?: Test })[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<Test | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [testsRes, partsRes] = await Promise.all([
      supabase.from('tests').select('*, teacher:profiles!tests_teacher_id_fkey(full_name)').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('test_participants').select('*, test:tests(*)').eq('student_id', profile!.id).order('created_at', { ascending: false }),
    ]);
    if (testsRes.data) setActiveTests(testsRes.data as any);
    if (partsRes.data) setMyParticipations(partsRes.data as any);
    setLoading(false);
  }

  async function joinTest(testId: string) {
    setJoinError(null);
    const test = activeTests.find(t => t.id === testId);
    if (!test) return;

    const existingParticipation = myParticipations.find(p => p.test_id === testId);

    if (existingParticipation) {
      if (existingParticipation.status === 'rejected') {
        setJoinError("Siz bu testga qo'shila olmaysiz. O'qituvchi sizni rad etdi.");
        return;
      }
      if (existingParticipation.status === 'invited' || existingParticipation.status === 'accepted') {
        setJoinError("Siz bu testga allaqachon qo'shilgansiz. O'qituvchi tasdiqlashini kuting.");
        return;
      }
      return;
    }

    if (!test.is_open) {
      const { data: participant } = await supabase
        .from('test_participants')
        .select('*')
        .eq('test_id', testId)
        .eq('student_id', profile!.id)
        .maybeSingle();

      if (!participant) {
        setJoinError("Siz testga qo'shila olmaysiz. O'qituvchi sizni taklif qilmagan.");
        return;
      }
    }

    const { error } = await supabase.from('test_participants').insert({
      test_id: testId,
      student_id: profile!.id,
      status: 'invited',
    });

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        setJoinError("Siz bu testga allaqachon qo'shilgansiz.");
      } else {
        setJoinError("Siz testga qo'shila olmaysiz. O'qituvchi ruxsat bermagan.");
      }
      return;
    }

    fetchData();
  }

  async function startTest(participation: TestParticipant & { test?: Test }) {
    if (!participation.test) return;
    if (participation.status !== 'accepted' && participation.status !== 'invited') {
      setJoinError("Siz bu testga qo'shila olmaysiz. O'qituvchi ruxsat bermagan.");
      return;
    }

    if (participation.status === 'invited') {
      setJoinError("O'qituvchi hali sizni tasdiqlamagan. Iltimos kuting.");
      return;
    }

    await supabase.from('test_participants').update({
      status: 'accepted',
      started_at: new Date().toISOString(),
    }).eq('id', participation.id);

    setActiveTest(participation.test);
  }

  if (activeTest) {
    return <TakeTest test={activeTest} onComplete={() => { setActiveTest(null); fetchData(); }} />;
  }

  const myTestIds = new Set(myParticipations.map(p => p.test_id));
  const availableTests = activeTests.filter(t => !myTestIds.has(t.id) || myParticipations.find(p => p.test_id === t.id && (p.status === 'accepted' || p.status === 'invited')));
  const completedTests = myParticipations.filter(p => p.status === 'completed');
  const pendingTests = myParticipations.filter(p => p.status === 'invited' || p.status === 'accepted');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">EduCRM</h1>
                <p className="text-xs text-slate-500">O'quvchi paneli</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 hidden sm:block">{profile?.full_name}</span>
              <button
                onClick={signOut}
                className="text-sm text-slate-500 hover:text-red-600 transition-colors font-medium"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Toast */}
        {joinError && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 animate-in">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-700">{joinError}</p>
            <button onClick={() => setJoinError(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg font-bold">&times;</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pendingTests.length}</p>
                <p className="text-xs text-slate-500">Kutilayotgan</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completedTests.length}</p>
                <p className="text-xs text-slate-500">Tugallangan</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {completedTests.length > 0 ? Math.round(completedTests.reduce((s, p) => s + (p.score ?? 0), 0) / completedTests.length) : '-'}
                </p>
                <p className="text-xs text-slate-500">O'rtacha ball</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Yuklanmoqda...</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Available Tests */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Mavjud testlar</h2>
              {activeTests.filter(t => !myTestIds.has(t.id)).length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400">Hozircha mavjud test yo'q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTests.filter(t => !myTestIds.has(t.id)).map(test => (
                    <div key={test.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{test.title}</h3>
                          {test.description && <p className="text-sm text-slate-500 truncate mt-1">{test.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{test.time_limit_minutes} daq</span>
                            {test.is_open && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold">Ochiq</span>}
                            {!test.is_open && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">Cheklangan</span>}
                          </div>
                          {(test as any).teacher?.full_name && (
                            <p className="text-xs text-slate-400 mt-1">O'qituvchi: {(test as any).teacher.full_name}</p>
                          )}
                        </div>
                        <button
                          onClick={() => joinTest(test.id)}
                          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 shrink-0"
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

            {/* My Tests */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Mening testlarim</h2>
              {myParticipations.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400">Hali testga qo'shilmagansiz</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myParticipations.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">{p.test?.title}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 ${
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
                            <p className="text-sm text-slate-600 font-medium">Ball: {p.score}</p>
                          )}
                        </div>
                        {p.status === 'accepted' && (
                          <button
                            onClick={() => startTest(p)}
                            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/25 shrink-0"
                          >
                            <Play className="w-4 h-4" />
                            Boshlash
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
