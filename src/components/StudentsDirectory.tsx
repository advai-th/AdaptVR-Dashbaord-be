import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Student } from '../types';

interface StudentsDirectoryProps {
  onSelectStudent: (student: Student) => void;
  onStartSessionForStudent?: (student: Student) => void;
}

export const StudentsDirectory: React.FC<StudentsDirectoryProps> = ({ onSelectStudent }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'sessions'>('name');
  
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('Grade 10');
  const [age, setAge] = useState('15');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fallback initial data in case API call fails
  const initialMockStudents: Student[] = [
    {
      id: '1',
      name: 'Alex Chen',
      grade: 'Grade 10',
      sessions: 12,
      avgScore: 64,
      needsAttention: true,
      latestModule: 'Solar System',
      avatarBg: 'bg-[#EF4444]',
      initials: 'AC',
    },
    {
      id: '2',
      name: 'Sarah Jenkins',
      grade: 'Grade 10',
      sessions: 14,
      avgScore: 92,
      needsAttention: false,
      latestModule: 'Cell Biology',
      avatarBg: 'bg-[#008378]',
      initials: 'SJ',
    },
    {
      id: '3',
      name: 'Marcus Rivera',
      grade: 'Grade 10',
      sessions: 11,
      avgScore: 81,
      needsAttention: false,
      latestModule: 'Solar System',
      avatarBg: 'bg-[#0397fd]',
      initials: 'MR',
    },
    {
      id: '4',
      name: 'David Kim',
      grade: 'Grade 10',
      sessions: 9,
      avgScore: 68,
      needsAttention: true,
      latestModule: 'Anatomy Basics',
      avatarBg: 'bg-[#F59E0B]',
      initials: 'DK',
    },
    {
      id: '5',
      name: 'Emma Watson',
      grade: 'Grade 10',
      sessions: 15,
      avgScore: 95,
      needsAttention: false,
      latestModule: 'Physics: Gravity',
      avatarBg: 'bg-[#008378]',
      initials: 'EW',
    },
  ];

  const getAvatarBg = (name: string) => {
    const colors = ['bg-[#008378]', 'bg-[#0397fd]', 'bg-[#F59E0B]', 'bg-[#8B5CF6]', 'bg-[#EC4899]'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Fetch students from DB
  const loadStudents = async () => {
    setLoading(true);
    try {
      const dbStudents = await api.getStudents();
      if (Array.isArray(dbStudents) && dbStudents.length > 0) {
        const formatted: Student[] = dbStudents.map((s: any) => ({
          id: s.student_id,
          name: s.full_name,
          grade: s.grade || 'Grade 10',
          age: s.age || 15,
          sessions: s.total_sessions || 0,
          avgScore: Math.round(parseFloat(s.avg_score || 0)),
          needsAttention: parseFloat(s.avg_score || 0) > 0 && parseFloat(s.avg_score || 0) < 70,
          latestModule: s.last_session_at ? 'Recent Session' : 'Mechanical Gear Assembly',
          avatarBg: getAvatarBg(s.full_name),
          initials: getInitials(s.full_name),
        }));
        setStudents(formatted);
      } else {
        setStudents(initialMockStudents);
      }
    } catch (err) {
      console.warn('[StudentsDirectory] DB load error, using fallback data:', err);
      setStudents(initialMockStudents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // Handle Add Student Submission
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setFormError('Please enter the student\'s full name');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const newStudentData = {
        full_name: fullName.trim(),
        grade: grade || 'Grade 10',
        age: parseInt(age, 10) || 15,
      };

      const created = await api.createStudent(newStudentData);

      const formattedNew: Student = {
        id: created.student_id || String(Date.now()),
        name: created.full_name || fullName,
        grade: created.grade || grade,
        age: created.age || parseInt(age, 10),
        sessions: 0,
        avgScore: 0,
        needsAttention: false,
        latestModule: 'Not Started',
        avatarBg: getAvatarBg(fullName),
        initials: getInitials(fullName),
      };

      setStudents((prev) => [formattedNew, ...prev]);
      setSuccessMessage(`Student "${fullName.trim()}" successfully added!`);
      
      setFullName('');
      setGrade('Grade 10');
      setAge('15');
      setIsAddModalOpen(false);

      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      console.error('Failed to create student:', err);
      setFormError(err.message || 'Failed to create student. Please check database connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Sort
  const filtered = students
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'score') return b.avgScore - a.avgScore;
      if (sortBy === 'sessions') return b.sessions - a.sessions;
      return 0;
    });

  const totalStudentsCount = students.length;
  const avgClassScore = Math.round(
    students.reduce((acc, s) => acc + s.avgScore, 0) / (students.length || 1)
  );
  const needsAttentionCount = students.filter((s) => s.needsAttention).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Message */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-[#e6f4ea] border border-[#34a853]/40 text-[#137333] text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="hover:opacity-75 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2a]">Students Directory</h1>
          <p className="text-sm text-[#3d4947] mt-1">Manage and track student progress in VR adaptive modules.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-lg border border-[#bcc9c6] bg-white hover:bg-[#eff4ff] text-[#121c2a] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filter
          </button>
          <button
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="h-10 px-4 rounded-lg bg-[#00685f] hover:bg-[#008378] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Student
          </button>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-[#bcc9c6]/40 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#3d4947]">Total Students</span>
            <span className="material-symbols-outlined text-[#6d7a77] text-[20px]">groups</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-[#121c2a]">{totalStudentsCount}</span>
            <span className="text-xs text-[#10B981] font-semibold mb-1 flex items-center">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span> Active
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#bcc9c6]/40 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#3d4947]">Class Avg Score</span>
            <span className="material-symbols-outlined text-[#6d7a77] text-[20px]">grade</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-[#121c2a]">{avgClassScore}%</span>
            <span className="text-xs text-[#3d4947] mb-1">Target: 85%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#bcc9c6]/40 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start mb-2 relative z-10">
            <span className="text-xs font-semibold text-[#3d4947]">Needs Attention</span>
            <span className="w-2 h-2 rounded-full bg-[#EF4444] mt-1"></span>
          </div>
          <div className="flex items-end gap-3 relative z-10">
            <span className="text-3xl font-bold text-[#EF4444]">{needsAttentionCount}</span>
            <span className="text-xs text-[#3d4947] mb-1">Students below 70%</span>
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/40 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#bcc9c6]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F9FAFB]">
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6d7a77] text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#bcc9c6] rounded-lg focus:border-[#00685f] focus:outline-none text-xs text-[#121c2a] h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#3d4947]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'score' | 'sessions')}
              className="bg-white border border-[#bcc9c6] rounded-lg px-3 py-1.5 text-xs text-[#121c2a] h-9 focus:border-[#00685f]"
            >
              <option value="name">Name (A-Z)</option>
              <option value="score">Avg Score (High-Low)</option>
              <option value="sessions">Sessions (Most)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <div className="w-7 h-7 border-2 border-[#00685f] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-[#3d4947] mt-3">Loading student records from database...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#eff4ff] border-b border-[#bcc9c6]/40 text-xs font-semibold text-[#3d4947]">
                  <th className="py-3 px-4 w-[250px]">Student Name</th>
                  <th className="py-3 px-4 w-[100px]">Grade</th>
                  <th className="py-3 px-4 w-[120px]">Sessions</th>
                  <th className="py-3 px-4 w-[140px]">Avg Score</th>
                  <th className="py-3 px-4">Latest Module</th>
                  <th className="py-3 px-4 text-center w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bcc9c6]/30 text-xs text-[#121c2a]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#3d4947]">
                      No students found. Click "Add Student" to create a new profile.
                    </td>
                  </tr>
                ) : (
                  filtered.map((st) => (
                    <tr
                      key={st.id}
                      onClick={() => onSelectStudent(st)}
                      className="hover:bg-[#eff4ff]/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${st.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                            {st.initials}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#121c2a]">{st.name}</span>
                            {st.needsAttention && (
                              <div className="w-2 h-2 rounded-full bg-[#EF4444]" title="Needs Attention (<70%)"></div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium">{st.grade}</td>
                      <td className="py-3.5 px-4 font-medium">{st.sessions}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${st.avgScore < 70 ? 'text-[#EF4444]' : 'text-[#121c2a]'}`}>
                            {st.avgScore}%
                          </span>
                          <div className="w-16 h-1.5 bg-[#d9e3f6] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${st.avgScore < 70 ? 'bg-[#EF4444]' : 'bg-[#00685f]'}`}
                              style={{ width: `${st.avgScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#eff4ff] text-[#3d4947] font-medium border border-[#bcc9c6]/40">
                          <span className="material-symbols-outlined text-[14px]">public</span>
                          {st.latestModule}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStudent(st);
                          }}
                          className="p-1.5 text-[#00685f] hover:bg-[#008378]/10 rounded-md transition-colors cursor-pointer"
                          title="View Profile Analytics"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#bcc9c6]/40 bg-[#F9FAFB] flex items-center justify-between">
          <span className="text-xs text-[#3d4947]">
            Showing 1 to {filtered.length} of {totalStudentsCount} entries
          </span>
          <div className="flex gap-1">
            <button className="w-8 h-8 rounded border border-[#bcc9c6] flex items-center justify-center text-[#3d4947] hover:bg-[#eff4ff] disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="w-8 h-8 rounded bg-[#00685f] text-white flex items-center justify-center text-xs font-semibold">1</button>
            <button className="w-8 h-8 rounded border border-[#bcc9c6] flex items-center justify-center text-[#3d4947] hover:bg-[#eff4ff]" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ADD STUDENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-[#121c2a]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#bcc9c6]/40 w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#eff4ff] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#00685f]/10 text-[#00685f] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#121c2a]">Add New Student</h3>
                  <p className="text-xs text-[#3d4947]">Create a learner profile in database</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
                className="text-[#6d7a77] hover:text-[#121c2a] p-1 rounded-lg transition-colors focus:outline-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="p-6 space-y-4 bg-[#F9FAFB]">
              {formError && (
                <div className="p-3 rounded-lg bg-[#ffdad6] border border-[#ba1a1a] flex items-start gap-2 text-xs text-[#ba1a1a]">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3d4947]" htmlFor="studentName">
                  Full Name <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bcc9c6] text-[18px]">
                    person
                  </span>
                  <input
                    id="studentName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sophia Rodriguez"
                    disabled={isSubmitting}
                    className="w-full h-10 pl-9 pr-3 bg-white border border-[#bcc9c6] rounded-lg text-xs text-[#121c2a] placeholder:text-[#bcc9c6] focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors outline-none disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#3d4947]" htmlFor="studentGrade">
                    Class / Grade
                  </label>
                  <select
                    id="studentGrade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3 bg-white border border-[#bcc9c6] rounded-lg text-xs text-[#121c2a] focus:border-[#00685f] outline-none"
                  >
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#3d4947]" htmlFor="studentAge">
                    Age
                  </label>
                  <input
                    id="studentAge"
                    type="number"
                    min="5"
                    max="99"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3 bg-white border border-[#bcc9c6] rounded-lg text-xs text-[#121c2a] focus:border-[#00685f] outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#bcc9c6]/30">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 h-9 rounded-lg border border-[#bcc9c6] text-[#3d4947] text-xs font-semibold hover:bg-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 h-9 bg-[#00685f] hover:bg-[#008378] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Student</span>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
