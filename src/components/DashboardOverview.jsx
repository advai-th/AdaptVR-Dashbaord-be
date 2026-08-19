import React, { useState } from 'react';

export const DashboardOverview = ({ onStartNewSession, onNavigate }) => {
  const [showWarning, setShowWarning] = useState(true);

  return (
    <div className="space-y-6">
      {/* Page Header & Warning Banner */}
      <div className="space-y-4">
        {showWarning && (
          <div className="bg-[#ffdad6]/40 border border-[#ffdad6] rounded-lg p-3.5 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#ba1a1a] mt-0.5" data-weight="fill">
              warning
            </span>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-[#121c2a]">Headset Disconnected</h4>
              <p className="text-xs text-[#3d4947]">
                Headset Oculus-04 disconnected unexpectedly during 'Biology Lab 3'.
              </p>
            </div>
            <button 
              onClick={() => setShowWarning(false)}
              className="text-[#3d4947] hover:text-[#121c2a]"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#121c2a] mb-1">Overview</h1>
            <p className="text-sm text-[#3d4947]">Monitor live sessions and student progress for Class 10-B.</p>
          </div>
          <button 
            onClick={onStartNewSession}
            className="lg:hidden w-full sm:w-auto h-[40px] px-4 bg-[#00685f] hover:bg-[#008378] text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Start New Session</span>
          </button>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Card 1 */}
        <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Total Students</span>
            <span className="material-symbols-outlined text-[#00685f] text-[20px]">groups</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#121c2a]">156</span>
          </div>
          <div className="mt-2 text-xs text-[#3d4947] flex items-center gap-1">
            <span className="text-[#10B981] font-semibold flex items-center">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> +2
            </span> this week
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Active VR Sessions</span>
            <span className="material-symbols-outlined text-[#0061a5] text-[20px]" data-weight="fill">sensors</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#121c2a]">8</span>
            <span className="text-sm text-[#3d4947]">/ 30</span>
          </div>
          <div className="w-full bg-[#e6eeff] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#0061a5] h-full rounded-full w-[26%]"></div>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Available Headsets</span>
            <span className="material-symbols-outlined text-[#10B981] text-[20px]">headset</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#121c2a]">12</span>
          </div>
          <div className="mt-2 text-xs text-[#3d4947] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block"></span> Ready for dispatch
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Completed Today</span>
            <span className="material-symbols-outlined text-[#924628] text-[20px]">check_circle</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#121c2a]">42</span>
            <span className="text-sm text-[#3d4947]">sessions</span>
          </div>
          <div className="mt-2 text-xs text-[#3d4947]">Avg. duration: 18m 40s</div>
        </div>
      </div>

      {/* Main Layout Grid: Table + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Live Sessions Panel */}
          <div className="bg-white rounded-xl border border-[#bcc9c6]/40 overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-[#bcc9c6]/40 flex justify-between items-center bg-[#ffffff]">
              <h2 className="text-lg font-semibold text-[#121c2a] flex items-center gap-2">
                <span className="relative flex h-3 w-3 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
                </span>
                Live Sessions
              </h2>
              <button 
                onClick={() => onNavigate('live-sessions')}
                className="text-[#0061a5] text-xs font-semibold hover:underline"
              >
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#bcc9c6]/40 text-xs font-semibold text-[#3d4947] uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Headset</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Module</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[#bcc9c6]/30">
                  <tr className="hover:bg-[#eff4ff] transition-colors cursor-pointer" onClick={() => onNavigate('live-sessions')}>
                    <td className="px-4 py-3 font-medium text-[#121c2a] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#3d4947]">headset_mic</span>
                      Oculus-01
                    </td>
                    <td className="px-4 py-3 text-[#121c2a]">Sarah Jenkins</td>
                    <td className="px-4 py-3 text-[#3d4947]">Cellular Mitosis V2</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-medium border border-[#10B981]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#3d4947]">14:22</td>
                  </tr>

                  <tr className="hover:bg-[#eff4ff] transition-colors cursor-pointer" onClick={() => onNavigate('live-sessions')}>
                    <td className="px-4 py-3 font-medium text-[#121c2a] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#3d4947]">headset_mic</span>
                      Vive-12
                    </td>
                    <td className="px-4 py-3 text-[#121c2a]">Marcus Chen</td>
                    <td className="px-4 py-3 text-[#3d4947]">Physics: Gravity</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-medium border border-[#10B981]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#3d4947]">08:15</td>
                  </tr>

                  <tr className="hover:bg-[#eff4ff] transition-colors bg-[#ffdad6]/10">
                    <td className="px-4 py-3 font-medium text-[#121c2a] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#EF4444]">headset_off</span>
                      Oculus-04
                    </td>
                    <td className="px-4 py-3 text-[#121c2a]">Emma Watson</td>
                    <td className="px-4 py-3 text-[#3d4947]">Biology Lab 3</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-medium border border-[#EF4444]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span> Disconnected
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#3d4947]">--:--</td>
                  </tr>

                  <tr className="hover:bg-[#eff4ff] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#121c2a] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#3d4947]">headset_mic</span>
                      Quest-08
                    </td>
                    <td className="px-4 py-3 text-[#121c2a]">David Kim</td>
                    <td className="px-4 py-3 text-[#3d4947]">Anatomy Basics</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] font-medium border border-[#F59E0B]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span> Paused
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#3d4947]">22:01</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Progress Summary Chart Area */}
          <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-[#121c2a]">Class 10-B Progress Summary</h3>
              <select className="bg-[#F9FAFB] border border-[#bcc9c6] rounded text-xs px-2 py-1 outline-none text-[#3d4947]">
                <option>This Week</option>
                <option>Last Week</option>
                <option>This Month</option>
              </select>
            </div>
            <div className="h-44 w-full border-b border-l border-[#bcc9c6]/30 relative mt-4 flex items-end justify-between px-2 pb-0 pt-4">
              <div className="absolute -left-6 top-0 h-full flex flex-col justify-between text-[10px] text-[#3d4947] pb-6">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              <div className="w-1/6 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-8 md:w-12 bg-[#00685f]/20 rounded-t h-[40%] relative">
                  <div className="absolute bottom-0 w-full bg-[#00685f] rounded-t h-[60%]"></div>
                </div>
                <span className="text-[11px] text-[#3d4947]">Mon</span>
              </div>
              <div className="w-1/6 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-8 md:w-12 bg-[#00685f]/20 rounded-t h-[65%] relative">
                  <div className="absolute bottom-0 w-full bg-[#00685f] rounded-t h-[75%]"></div>
                </div>
                <span className="text-[11px] text-[#3d4947]">Tue</span>
              </div>
              <div className="w-1/6 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-8 md:w-12 bg-[#00685f]/20 rounded-t h-[50%] relative">
                  <div className="absolute bottom-0 w-full bg-[#00685f] rounded-t h-[40%]"></div>
                </div>
                <span className="text-[11px] text-[#3d4947]">Wed</span>
              </div>
              <div className="w-1/6 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-8 md:w-12 bg-[#00685f]/20 rounded-t h-[80%] relative">
                  <div className="absolute bottom-0 w-full bg-[#00685f] rounded-t h-[85%]"></div>
                </div>
                <span className="text-[11px] font-bold text-[#121c2a]">Thu</span>
              </div>
              <div className="w-1/6 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-8 md:w-12 bg-[#00685f]/20 rounded-t h-[20%] relative">
                  <div className="absolute bottom-0 w-full bg-[#00685f] rounded-t h-[30%]"></div>
                </div>
                <span className="text-[11px] text-[#3d4947]">Fri</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#00685f]"></span>
                <span className="text-xs text-[#3d4947]">Completion Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#00685f]/20"></span>
                <span className="text-xs text-[#3d4947]">Engagement Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Needs Attention & Activity */}
        <div className="flex flex-col gap-6">
          {/* Needs Attention Panel */}
          <div className="bg-white rounded-xl border border-[#ffdad6] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#bcc9c6]/30 bg-[#ffdad6]/10 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F59E0B] text-[20px]" data-weight="fill">
                error
              </span>
              <h3 className="text-base font-semibold text-[#121c2a]">Needs Attention</h3>
            </div>
            <div className="p-2 flex flex-col gap-1">
              <div className="p-3 rounded-lg hover:bg-[#eff4ff] transition-colors flex gap-3 items-start cursor-pointer" onClick={() => onNavigate('students')}>
                <div className="w-8 h-8 rounded-full bg-[#d0dbed] flex items-center justify-center shrink-0 text-xs font-semibold text-[#121c2a]">
                  JD
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-xs font-semibold text-[#121c2a] truncate">Jason Doe</h4>
                    <span className="text-[11px] text-[#EF4444] font-medium">High</span>
                  </div>
                  <p className="text-xs text-[#3d4947]">3 failed attempts at 'Molecule Rotation' module.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg hover:bg-[#eff4ff] transition-colors flex gap-3 items-start cursor-pointer" onClick={() => onNavigate('students')}>
                <div className="w-8 h-8 rounded-full bg-[#d0dbed] flex items-center justify-center shrink-0 text-xs font-semibold text-[#121c2a]">
                  AL
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-xs font-semibold text-[#121c2a] truncate">Alicia Lin</h4>
                    <span className="text-[11px] text-[#F59E0B] font-medium">Med</span>
                  </div>
                  <p className="text-xs text-[#3d4947]">Stationary for &gt;5 minutes in 'Solar System'.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg hover:bg-[#eff4ff] transition-colors flex gap-3 items-start cursor-pointer" onClick={() => onNavigate('students')}>
                <div className="w-8 h-8 rounded-full bg-[#d0dbed] flex items-center justify-center shrink-0 text-xs font-semibold text-[#121c2a]">
                  TR
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-xs font-semibold text-[#121c2a] truncate">Tyler Reed</h4>
                    <span className="text-[11px] text-[#F59E0B] font-medium">Med</span>
                  </div>
                  <p className="text-xs text-[#3d4947]">Motion sickness flag triggered.</p>
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-[#bcc9c6]/30 bg-[#F9FAFB] text-center">
              <button onClick={() => onNavigate('students')} className="text-xs font-semibold text-[#0061a5] hover:underline">
                Review Intervention Plan
              </button>
            </div>
          </div>

          {/* Activity Stream */}
          <div className="bg-white rounded-xl border border-[#bcc9c6]/40 overflow-hidden flex-1 flex flex-col shadow-sm">
            <div className="p-4 border-b border-[#bcc9c6]/30">
              <h3 className="text-base font-semibold text-[#121c2a]">Recent Activity</h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="relative border-l border-[#bcc9c6]/40 ml-3 space-y-6 pb-2">
                <div className="relative pl-5">
                  <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white"></span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[#121c2a]">Session Completed</span>
                    <p className="text-xs text-[#3d4947]">Class 10-A finished 'Intro to Physics' with 92% average completion.</p>
                    <span className="text-[10px] text-[#3d4947]/70 mt-0.5">10 mins ago</span>
                  </div>
                </div>

                <div className="relative pl-5">
                  <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-[#d0dbed] border-2 border-white"></span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[#121c2a]">Module Updated</span>
                    <p className="text-xs text-[#3d4947]">'Cellular Mitosis V2' content patch applied successfully.</p>
                    <span className="text-[10px] text-[#3d4947]/70 mt-0.5">1 hour ago</span>
                  </div>
                </div>

                <div className="relative pl-5">
                  <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-[#d0dbed] border-2 border-white"></span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[#121c2a]">Headset Assigned</span>
                    <p className="text-xs text-[#3d4947]">5 new Oculus Quest 3 headsets registered to Science Wing.</p>
                    <span className="text-[10px] text-[#3d4947]/70 mt-0.5">Yesterday, 4:30 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
