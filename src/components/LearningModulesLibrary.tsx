import React, { useState } from 'react';

interface LearningModulesLibraryProps {
  onStartModule: (module: any) => void;
}

export const LearningModulesLibrary: React.FC<LearningModulesLibraryProps> = ({ onStartModule }) => {
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');

  const modules = [
    {
      id: 'm1',
      title: 'Adaptive Solar System Lab',
      subject: 'Science',
      grade: 'Grade 8-10',
      duration: '45m',
      description: 'An immersive journey through the solar system featuring dynamic gravity simulations and AI-guided spatial puzzles.',
      active: true,
      completion: '68%',
      adaptations: ['Orbit Guides', 'Smart Hints', 'Auto-Difficulty'],
      highlight: true,
    },
    {
      id: 'm2',
      title: 'Cellular Mitosis Explorer',
      subject: 'Biology',
      grade: 'Grade 9-12',
      duration: '60m',
      description: 'Observe and interact with the stages of cell division in real-time 3D space.',
      status: 'Needs Attention',
      statusColor: 'bg-[#eff4ff] text-[#3d4947]',
    },
    {
      id: 'm3',
      title: 'Ancient Rome Walkthrough',
      subject: 'History',
      grade: 'Grade 7-9',
      duration: '30m',
      description: 'Navigate the Forum Romanum and inspect architectural marvels with AI-guided historical context.',
      status: 'Ready to Assign',
      statusColor: 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20',
    },
    {
      id: 'm4',
      title: 'Physics: Gravity Mechanics',
      subject: 'Physics',
      grade: 'Grade 10-12',
      duration: '40m',
      description: 'Experiment with gravitational constants and orbital velocity vectors in zero-G environment.',
      status: 'Ready to Assign',
      statusColor: 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20',
    },
  ];

  const filtered = modules.filter((m) => {
    if (subjectFilter !== 'All' && m.subject !== subjectFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2a]">Module Library</h1>
          <p className="text-sm text-[#3d4947] mt-1">Browse and manage immersive learning experiences.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-10 px-3 bg-white border border-[#bcc9c6] rounded-lg text-xs font-semibold text-[#121c2a] focus:border-[#00685f]"
          >
            <option value="All">Subject: All</option>
            <option value="Science">Science</option>
            <option value="Biology">Biology</option>
            <option value="History">History</option>
            <option value="Physics">Physics</option>
          </select>

          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="h-10 px-3 bg-white border border-[#bcc9c6] rounded-lg text-xs font-semibold text-[#121c2a] focus:border-[#00685f]"
          >
            <option value="All">Grade: All</option>
            <option value="6-8">Grade 6-8</option>
            <option value="8-10">Grade 8-10</option>
            <option value="10-12">Grade 10-12</option>
          </select>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((m) => {
          if (m.highlight) {
            return (
              <div
                key={m.id}
                className="lg:col-span-2 bg-white rounded-xl border border-[#bcc9c6]/40 overflow-hidden flex flex-col md:flex-row shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="md:w-2/5 h-48 md:h-auto bg-[#00685f]/10 p-6 flex flex-col justify-between relative">
                  <div className="bg-[#10B981] text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider self-start flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Active
                  </div>
                  <span className="material-symbols-outlined text-[#00685f] text-[64px] self-center my-auto">public</span>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-[#eff4ff] text-[#00685f] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {m.subject} • {m.grade}
                      </span>
                      <span className="flex items-center gap-1 text-[#3d4947] text-xs">
                        <span className="material-symbols-outlined text-[16px]">schedule</span> {m.duration}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[#121c2a] mb-2">{m.title}</h3>
                    <p className="text-xs text-[#3d4947] mb-4">{m.description}</p>

                    <div className="bg-[#F9FAFB] rounded-lg p-3 border border-[#bcc9c6]/30 hidden md:block">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[10px] font-semibold text-[#3d4947] uppercase tracking-wider">Adaptations</span>
                          <div className="flex gap-1.5 mt-1">
                            {m.adaptations?.map((a: string) => (
                              <span key={a} className="bg-white border border-[#bcc9c6]/40 px-2 py-0.5 rounded text-[10px] font-medium text-[#121c2a]">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-[#3d4947] uppercase tracking-wider">Completion</span>
                          <div className="text-sm font-bold text-[#121c2a]">{m.completion}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button className="px-4 py-2 border border-[#bcc9c6] rounded-lg text-xs font-semibold text-[#121c2a] hover:bg-[#eff4ff] cursor-pointer">
                      Details
                    </button>
                    <button
                      onClick={() => onStartModule(m)}
                      className="px-4 py-2 bg-[#00685f] hover:bg-[#008378] text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span> Launch
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className="bg-white rounded-xl border border-[#bcc9c6]/40 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-32 bg-[#eff4ff] flex items-center justify-center border-b border-[#bcc9c6]/30">
                <span className="material-symbols-outlined text-[#00685f] text-[48px]">
                  {m.subject === 'Biology' ? 'science' : m.subject === 'History' ? 'account_balance' : 'precision_manufacturing'}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#eff4ff] text-[#00685f] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {m.subject} • {m.grade}
                    </span>
                    <span className="flex items-center gap-1 text-[#3d4947] text-[11px]">
                      <span className="material-symbols-outlined text-[14px]">schedule</span> {m.duration}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#121c2a] mb-1">{m.title}</h3>
                  <p className="text-xs text-[#3d4947] line-clamp-2 mb-3">{m.description}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#eff4ff]">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${m.statusColor}`}>
                    {m.status}
                  </span>
                  <button
                    onClick={() => onStartModule(m)}
                    className="p-1.5 rounded text-[#00685f] hover:bg-[#008378]/10 cursor-pointer"
                    title="Launch Module"
                  >
                    <span className="material-symbols-outlined text-[20px]">play_circle</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
