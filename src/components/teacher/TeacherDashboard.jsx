import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, BookOpen, Users, Clock, CheckCircle, Play, Eye, Trash2, Menu, X } from 'lucide-react';
import TestForm from './TestForm';
import TestDetail from './TestDetail';

export default function TeacherDashboard() {
  const { profile, signOut } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [participantCounts, setParticipantCounts] = useState({});
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  async function fetchTests() {
    const { data } = await supabase
      .from('tests')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) {
      setTests(data);
      const counts = {};
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

  async function deleteTest(testId) {
    if (!confirm("Haqiqatan ham bu testni o'chirmoqchimisiz?")) return;
    await supabase.from('tests').delete().eq('id', testId);
    fetchTests();
  }

  async function toggleTestStatus(test) {
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900">EduCRM</h1>
                <p className="text-xs text-slate-500 hidden sm:block">O'qituvchi paneli</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={signOut}
                className="text-xs sm:text-sm text-slate-500 hover:text-red-600 transition-colors font-medium"
              >
                Chiqish
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors sm:hidden"
              >
                {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Testlar</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Play className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.active}</p>
                <p className="text-xs text-slate-500">Faol</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.completed}</p>
                <p className="text-xs text-slate-500">Tugallangan</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.totalParticipants}</p>
                <p className="text-xs text-slate-500">Ishtirokchilar</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Mening testlarim</h2>
          <button
            onClick={() => { setEditingTest(null); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yangi test</span>
            <span className="sm:hidden">Test</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Yuklanmoqda...</div>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-100">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-600 mb-2">Hali test yo'q</h3>
            <p className="text-slate-400 mb-4 sm:mb-6 text-sm sm:text-base">Birinchi testni yarating</p>
            <button
              onClick={() => { setEditingTest(null); setShowForm(true); }}
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all"
            >
              Test yaratish
            </button>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-4">
            {tests.map(test => (
              <div
                key={test.id}
                className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedTest(test)}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{test.title}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                        test.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                        test.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {test.status === 'active' ? 'Faol' : test.status === 'completed' ? 'Tugallangan' : 'Qoralama'}
                      </span>
                    </div>
                    {test.description && (
                      <p className="text-xs sm:text-sm text-slate-500 truncate">{test.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {test.time_limit_minutes}daq
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {participantCounts[test.id] ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleTestStatus(test)}
                      className={`p-2 rounded-lg transition-colors ${
                        test.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' :
                        test.status === 'draft' ? 'text-amber-600 hover:bg-amber-50' :
                        'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedTest(test)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTest(test.id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
