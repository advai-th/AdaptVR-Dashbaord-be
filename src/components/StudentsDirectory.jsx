import React, { useState } from 'react';

export const StudentsDirectory = ({ onSelectStudent }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const students = [
    {
      id: '1',
      name: 'Alex Chen',
      grade: '10',
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
      grade: '10',
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
      grade: '10',
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
      grade: '10',
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
      grade: '10',
      sessions: 15,
      avgScore: 95,
      needsAttention: false,
      latestModule: 'Physics: Gravity',
      avatarBg: 'bg-[#008378]',
      initials: 'EW',
    },
  ];

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2a]">Students Directory</h1>
          <p className="text-sm text-[#3d4947] mt-1">Manage and track student progress in Class 10-B.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-lg border border-[#bcc9c6] bg-white hover:bg-[#eff4ff] text-[#121c2a] text-xs font-semibold flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filter
          </button>
          <button className="h-10 px-4 rounded-lg bg-[#00685f] hover:bg-[#008378] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm">
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
            <span className="text-3xl font-bold text-[#121c2a]">32</span>
            <span className="text-xs text-[#10B981] font-semibold mb-1 flex items-center">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span> 2%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#bcc9c6]/40 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#3d4947]">Class Avg Score</span>
            <span className="material-symbols-outlined text-[#6d7a77] text-[20px]">grade</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-[#121c2a]">88%</span>
            <span className="text-xs text-[#3d4947] mb-1">Target: 85%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#bcc9c6]/40 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start mb-2 relative z-10">
            <span className="text-xs font-semibold text-[#3d4947]">Needs Attention</span>
            <span className="w-2 h-2 rounded-full bg-[#EF4444] mt-1"></span>
          </div>
          <div className="flex items-end gap-3 relative z-10">
            <span className="text-3xl font-bold text-[#EF4444]">4</span>
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
              onChange={(e) => setSortBy(e.target.value)}
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
              {filtered.map((st) => (
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
                          <div className="w-2 h-2 rounded-full bg-[#EF4444]" title="Needs Attention"></div>
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
                      className="p-1.5 text-[#00685f] hover:bg-[#008378]/10 rounded-md transition-colors"
                      title="View Profile Analytics"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#bcc9c6]/40 bg-[#F9FAFB] flex items-center justify-between">
          <span className="text-xs text-[#3d4947]">Showing 1 to {filtered.length} of 32 entries</span>
          <div className="flex gap-1">
            <button className="w-8 h-8 rounded border border-[#bcc9c6] flex items-center justify-center text-[#3d4947] hover:bg-[#eff4ff] disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="w-8 h-8 rounded bg-[#00685f] text-white flex items-center justify-center text-xs font-semibold">1</button>
            <button className="w-8 h-8 rounded border border-[#bcc9c6] flex items-center justify-center text-[#3d4947] hover:bg-[#eff4ff] text-xs font-semibold">2</button>
            <button className="w-8 h-8 rounded border border-[#bcc9c6] flex items-center justify-center text-[#3d4947] hover:bg-[#eff4ff]">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
