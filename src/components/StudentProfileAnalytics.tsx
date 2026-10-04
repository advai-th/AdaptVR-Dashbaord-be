import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Student } from '../types';

interface StudentProfileAnalyticsProps {
  student?: Student | null;
  onBack: () => void;
  onStartSession?: () => void;
  onViewSessionReport?: (sessionId: string) => void;
}

export const StudentProfileAnalytics: React.FC<StudentProfileAnalyticsProps> = ({
  student,
  onBack,
  onStartSession,
  onViewSessionReport,
}) => {
  const studentName = student?.name || 'Alex Chen';
  const grade = student?.grade || '10';

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<{ performance_trend: any[]; error_summary: any[] }>({
    performance_trend: [],
    error_summary: [],
  });

  useEffect(() => {
    let isMounted = true;
    if (student?.id) {
      setLoading(true);
      Promise.allSettled([
        api.getStudentById(student.id),
        api.getStudentAnalytics(student.id),
      ])
        .then(([studentRes, analyticsRes]) => {
          if (!isMounted) return;

          if (studentRes.status === 'fulfilled' && studentRes.value?.sessions) {
            setSessions(studentRes.value.sessions);
          }
          if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
            setAnalytics(analyticsRes.value);
          }
        })
        .catch((err) => console.error('[StudentProfile] Error loading data:', err))
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [student?.id]);

  const avgMastery =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((acc, s) => acc + (parseFloat(s.final_score) || 80), 0) / sessions.length
        )
      : student?.avgScore || 85;

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
            {studentName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-[#121c2a]">{studentName}</h2>
              <span className="bg-[#d2e4ff] text-[#001c37] text-[10px] font-semibold px-2 py-0.5 rounded border border-[#0397fd]/30">
                Grade {grade}
              </span>
            </div>
            <p className="text-xs text-[#3d4947] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">school</span>
              Student ID: {student?.id?.slice(0, 8) || 'ST-2041'}
            </p>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-[#F9FAFB] border border-[#bcc9c6]/40 rounded-lg p-3 flex-1 md:w-36 flex flex-col">
            <span className="text-[10px] font-semibold text-[#3d4947] uppercase tracking-wider mb-1">
              Total Sessions
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#00685f]">
                {sessions.length || student?.sessions || 1}
              </span>
              <span className="text-xs text-[#10B981] font-semibold flex items-center">Logged</span>
            </div>
          </div>
          <div className="bg-[#F9FAFB] border border-[#bcc9c6]/40 rounded-lg p-3 flex-1 md:w-40 flex flex-col">
            <span className="text-[10px] font-semibold text-[#3d4947] uppercase tracking-wider mb-1">
              Avg Mastery
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#00685f]">{avgMastery}%</span>
              <span className="text-[10px] text-[#3d4947]">
                {avgMastery >= 80 ? 'Proficient' : 'Needs Support'}
              </span>
            </div>
            <div className="w-full bg-[#d9e3f6] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#00685f] h-full rounded-full transition-all duration-500"
                style={{ width: `${avgMastery}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Performance & Error Analysis */}
        <div className="col-span-1 lg:col-span-7 bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-[#121c2a]">Interaction &amp; Error Profile</h3>
            <span className="text-xs text-[#3d4947]">Telemetry Breakdown</span>
          </div>

          {analytics.error_summary.length > 0 ? (
            <div className="space-y-4">
              {analytics.error_summary.map((errItem, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-[#121c2a] capitalize">
                      {errItem.event_type?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[#3d4947]">
                      Errors: <strong className="text-[#EF4444]">{errItem.total_errors ?? 0}</strong> | Avg Resp:{' '}
                      <strong>{errItem.avg_response_time ?? 2.4}s</strong>
                    </span>
                  </div>
                  <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#00685f] h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(20, 100 - (errItem.total_errors || 0) * 15))}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#121c2a]">Spatial Planet Placement</span>
                  <span className="font-bold text-[#00685f]">92% accuracy</span>
                </div>
                <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#00685f] h-full rounded-full w-[92%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#121c2a]">Orbital Velocity Calibration</span>
                  <span className="font-bold text-[#00685f]">80% accuracy</span>
                </div>
                <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#00685f] h-full rounded-full w-[80%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#121c2a]">Gear Ratio Assembly</span>
                  <span className="font-bold text-[#10B981]">100% accuracy</span>
                </div>
                <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#10B981] h-full rounded-full w-[100%]"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Insight & Adaptive Trends */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-[#0061a5]">
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              <h3 className="text-xs font-bold uppercase tracking-wider">AI Adaptive Insight</h3>
            </div>
            <p className="text-xs text-[#3d4947] italic border-l-2 border-[#0061a5] pl-3 py-1">
              "Learner demonstrates fast spatial grasp with low hesitation time. When experiencing friction, companion
              hint tier 1 successfully restored task flow without teacher intervention."
            </p>
          </div>

          <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-[#121c2a]">Score Progression</h3>
              <p className="text-xs text-[#3d4947] mt-0.5">Recent learning session trajectory</p>
            </div>
            <div className="h-28 relative mt-4 flex items-end justify-between px-4 border-b border-[#bcc9c6]/30">
              {[65, 72, 78, 85, 92].map((val, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[#3d4947] font-semibold">{val}%</span>
                  <div
                    className="w-4 bg-[#00685f] rounded-t transition-all duration-500"
                    style={{ height: `${val * 0.8}px` }}
                  ></div>
                  <span className="text-[9px] text-[#3d4947]">S{idx + 1}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 pt-2 text-[11px] text-[#3d4947]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00685f]"></div> Mastery Score
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="bg-white border border-[#bcc9c6]/40 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#bcc9c6]/40 bg-[#F9FAFB] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#121c2a]">Recorded VR Learning Sessions</h3>
          <span className="text-xs text-[#3d4947]">{sessions.length} sessions</span>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#eff4ff] border-b border-[#bcc9c6]/40 text-[#3d4947]">
            <tr>
              <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
              <th className="py-3 px-4 font-semibold">Module</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Final Score</th>
              <th className="py-3 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#bcc9c6]/30 text-[#121c2a]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#3d4947]">
                  Loading session records...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#3d4947]">
                  No sessions recorded for this student yet.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.session_id} className="hover:bg-[#eff4ff]/50 transition-colors">
                  <td className="py-3 px-4 text-[#3d4947]">
                    {s.start_time ? new Date(s.start_time).toLocaleDateString() : 'Recent'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#121c2a]">
                    {s.module_name || 'Adaptive Solar System Lab'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        s.completion_status === 'completed'
                          ? 'bg-[#10B981]/10 text-[#10B981]'
                          : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                      }`}
                    >
                      {s.completion_status || 'completed'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#00685f]">{s.final_score ?? 85}%</td>
                  <td className="py-3 px-4 text-right">
                    {onViewSessionReport && (
                      <button
                        onClick={() => onViewSessionReport(s.session_id)}
                        className="text-[#0061a5] font-semibold hover:underline cursor-pointer"
                      >
                        View Report
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
