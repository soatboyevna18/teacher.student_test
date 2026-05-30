import { useState, useEffect } from 'react';
import { supabase, type Test, type TestParticipant } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, BookOpen, Users, Clock, CheckCircle, Play, Eye, Trash2, ChevronRight } from 'lucide-react';
import TestForm from './TestForm';
import TestDetail from './TestDetail';

export default function TeacherDashboard() {
  const { profile, signOut } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchTests();
  }, []);

  async function fetchTests() {
    const { data } = await supabase
      .from('tests')
      .select('*')
      .eq('teacher_id', profile!.id)
      .order('created_at', { ascending: false });
    if (data) {
      setTests(data);
      const counts: Record<string, number> = {};
      for (const test of data) {
        const { count } = await supabase
          .from('test_participants')
          .select('*', { count: 'exact', head: true })
          .eq('test_id', test.id);
        counts[test.id] = count ?? 0;
      }
      setParticipantCounts(counts);
    }
    setLoading(false);
  }

  async function deleteTest(testId: string) {
    if (!confirm("Haqiqatan ham bu testni o'chirmoqchimisiz?")) return;
    await supabase.from('tests').delete().eq('id', testId);
    fetchTests();
  }

  async function toggleTestStatus(test: Test) {
    const newStatus = test.status === 'draft' ? 'active' : test.status === 'active' ? 'completed' : 'draft';
    await supabase.from('tests').update({ status: newStatus }).eq('id', test.id);
    fetchTests();
  }

  if (selectedTest) {
    return <TestDetail test={selectedTest} onBack={() => { setSelectedTest(null); fetchTests(); }} />;
  }

  const stats = {
    total: tests.length,
    active: tests.filter(t => t.status === 'active').length,
    completed: tests.filter(t => t.status === 'completed').length,
    totalParticipants: Object.values(participantCounts).reduce((a, b) => a + b, 0),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">EduCRM</h1>
                <p className="text-xs text-slate-500">O'qituvchi paneli</p>
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
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Jami testlar</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                <p className="text-xs text-slate-500">Faol testlar</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
                <p className="text-xs text-slate-500">Tugallangan</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalParticipants}</p>
                <p className="text-xs text-slate-500">Ishtirokchilar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tests */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Mening testlarim</h2>
          <button
            onClick={() => { setEditingTest(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Yangi test
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Yuklanmoqda...</div>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Hali test yo'q</h3>
            <p className="text-slate-400 mb-6">Birinchi testni yarating va o'quvchilarga yuboring</p>
            <button
              onClick={() => { setEditingTest(null); setShowForm(true); }}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              Test yaratish
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {tests.map(test => (
              <div
                key={test.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedTest(test)}>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 truncate">{test.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                        test.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                        test.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {test.status === 'active' ? 'Faol' : test.status === 'completed' ? 'Tugallangan' : 'Qoralama'}
                      </span>
                      {test.is_open && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                          Ochiq
                        </span>
                      )}
                    </div>
                    {test.description && (
                      <p className="text-sm text-slate-500 truncate">{test.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {test.time_limit_minutes} daqiqa
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {participantCounts[test.id] ?? 0} ishtirokchi
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTestStatus(test)}
                      className={`p-2 rounded-lg transition-colors ${
                        test.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' :
                        test.status === 'draft' ? 'text-amber-600 hover:bg-amber-50' :
                        'text-slate-400 hover:bg-slate-50'
                      }`}
                      title={test.status === 'draft' ? 'Faollashtirish' : test.status === 'active' ? 'Tugallash' : 'Qoralamaga qaytarish'}
                    >
                      <Play className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedTest(test)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteTest(test.id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Test Form Modal */}
      {showForm && (
        <TestForm
          test={editingTest}
          onClose={() => { setShowForm(false); setEditingTest(null); }}
          onSaved={() => { setShowForm(false); setEditingTest(null); fetchTests(); }}
        />
      )}
    </div>
  );
}
