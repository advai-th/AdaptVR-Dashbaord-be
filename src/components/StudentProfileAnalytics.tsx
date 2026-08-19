import React from 'react';
import { Student } from '../types';

interface StudentProfileAnalyticsProps {
  student?: Student | null;
  onBack: () => void;
  onStartSession?: () => void;
}

export const StudentProfileAnalytics: React.FC<StudentProfileAnalyticsProps> = ({ student, onBack, onStartSession }) => {
  const studentName = student?.name || 'Alex Chen';
  const grade = student?.grade || '10';

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-[#00685f] hover:underline cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Students Directory
        </button>
        {onStartSession && (
          <button
            onClick={onStartSession}
            className="h-9 px-4 bg-[#00685f] hover:bg-[#008378] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Start Session with {studentName.split(' ')[0]}
          </button>
        )}
      </div>

      {/* Student Header & Summary Stats */}
      <section className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-5 rounded-xl border border-[#bcc9c6]/40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#008378] text-white font-bold flex items-center justify-center text-lg shrink-0">
            {studentName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-[#121c2a]">{studentName}</h2>
              <span className="bg-[#d2e4ff] text-[#001c37] text-[10px] font-semibold px-2 py-0.5 rounded border border-[#0397fd]/30">
                Grade {grade}
              </span>
            </div>
            <p className="text-xs text-[#3d4947] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">mail</span>
              {studentName.toLowerCase().replace(' ', '.')}@northwood.edu
            </p>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-[#F9FAFB] border border-[#bcc9c6]/40 rounded-lg p-3 flex-1 md:w-36 flex flex-col">
            <span className="text-[10px] font-semibold text-[#3d4947] uppercase tracking-wider mb-1">Total Sessions</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#00685f]">{student?.sessions || 14}</span>
              <span className="text-xs text-[#10B981] font-semibold flex items-center">+2</span>
            </div>
          </div>
          <div className="bg-[#F9FAFB] border border-[#bcc9c6]/40 rounded-lg p-3 flex-1 md:w-40 flex flex-col">
            <span className="text-[10px] font-semibold text-[#3d4947] uppercase tracking-wider mb-1">Avg Mastery</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#00685f]">{student?.avgScore || 92}%</span>
              <span className="text-[10px] text-[#3d4947]">Top 15%</span>
            </div>
            <div className="w-full bg-[#d9e3f6] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#00685f] h-full rounded-full" style={{ width: `${student?.avgScore || 92}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Concept Mastery Chart */}
        <div className="col-span-1 lg:col-span-7 bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base font-bold text-[#121c2a]">Concept Mastery</h3>
            <div className="bg-[#eff4ff] border border-[#bcc9c6]/40 px-3 py-1 rounded-md text-xs text-[#3d4947] flex items-center gap-1 cursor-pointer">
              Solar System <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#121c2a]">Planet Order</span>
                <span className="font-bold text-[#00685f]">95%</span>
              </div>
              <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden">
                <div className="bg-[#00685f] h-full rounded-full w-[95%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#121c2a]">Properties</span>
                <span className="font-bold text-[#00685f]">80%</span>
              </div>
              <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden">
                <div className="bg-[#00685f] h-full rounded-full w-[80%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#121c2a]">Rotation</span>
                <span className="font-bold text-[#00685f]">100%</span>
              </div>
              <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden">
                <div className="bg-[#00685f] h-full rounded-full w-[100%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#121c2a] flex items-center gap-1">
                  Seasons <span className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block"></span>
                </span>
                <span className="font-bold text-[#F59E0B]">70%</span>
              </div>
              <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden">
                <div className="bg-[#F59E0B] h-full rounded-full w-[70%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight & Adaptive Trends */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-[#0061a5]">
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              <h3 className="text-xs font-bold uppercase tracking-wider">AI Insight &amp; Notes</h3>
            </div>
            <p className="text-xs text-[#3d4947] italic border-l-2 border-[#0061a5] pl-3 py-1">
              "Made repeated placement errors in Properties, then improved significantly after orbit guides were enabled."
            </p>
          </div>

          <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-[#121c2a]">Adaptive Trends</h3>
              <p className="text-xs text-[#3d4947] mt-0.5">Hint usage vs. task accuracy</p>
            </div>
            <div className="h-28 relative mt-4 flex items-end justify-between px-2 border-b border-[#bcc9c6]/30">
              <div className="w-1.5 bg-[#00685f]/20 h-[40%] rounded-t"></div>
              <div className="w-1.5 bg-[#00685f]/20 h-[60%] rounded-t"></div>
              <div className="w-1.5 bg-[#00685f]/20 h-[30%] rounded-t"></div>
              <div className="w-1.5 bg-[#00685f]/20 h-[80%] rounded-t"></div>
              <div className="w-1.5 bg-[#00685f]/20 h-[90%] rounded-t"></div>
              <div className="w-1.5 bg-[#00685f]/20 h-[100%] rounded-t"></div>
            </div>
            <div className="flex gap-4 mt-3 pt-2 text-[11px] text-[#3d4947]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00685f]"></div> Accuracy
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></div> Hints Used
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="bg-white border border-[#bcc9c6]/40 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#bcc9c6]/40 bg-[#F9FAFB]">
          <h3 className="text-sm font-bold text-[#121c2a]">Recent Sessions</h3>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#eff4ff] border-b border-[#bcc9c6]/40 text-[#3d4947]">
            <tr>
              <th className="py-3 px-4 font-semibold">Date</th>
              <th className="py-3 px-4 font-semibold">Module</th>
              <th className="py-3 px-4 font-semibold">Duration</th>
              <th className="py-3 px-4 font-semibold">Mastery</th>
              <th className="py-3 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#bcc9c6]/30 text-[#121c2a]">
            <tr>
              <td className="py-3 px-4">Oct 24, 2023</td>
              <td className="py-3 px-4 font-semibold">Solar System: Orbits</td>
              <td className="py-3 px-4 text-[#3d4947]">45 min</td>
              <td className="py-3 px-4">
                <span className="px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-semibold">92%</span>
              </td>
              <td className="py-3 px-4 text-right">
                <button className="text-[#0061a5] font-semibold hover:underline">View Replay</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
