import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { VRDevice } from '../types';

interface DashboardOverviewProps {
  onStartNewSession: () => void;
  onNavigate: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onStartNewSession, onNavigate }) => {
  const [showWarning, setShowWarning] = useState(true);
  const [loading, setLoading] = useState(true);

  // Live state
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    activeSessions: 0,
    availableHeadsets: 0,
    completedSessions: 0,
    avgScore: 0,
  });

  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [needsAttention, setNeedsAttention] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [disconnectedHeadset, setDisconnectedHeadset] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setLoading(true);
        const [overviewRes, sessionsRes, devicesRes, studentsRes] = await Promise.allSettled([
          api.getAnalyticsOverview(),
          api.getSessions(),
          api.getDevices(),
          api.getStudents(),
        ]);

        if (!isMounted) return;

        // Overview & Analytics
        const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null;
        const sessions: any[] = sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value) ? sessionsRes.value : [];
        const devices: VRDevice[] = devicesRes.status === 'fulfilled' && Array.isArray(devicesRes.value) ? devicesRes.value : [];
        const students: any[] = studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value) ? studentsRes.value : [];

        // Active sessions (in_progress)
        const active = sessions.filter((s) => s.completion_status === 'in_progress');
        // Completed sessions
        const completed = sessions.filter((s) => s.completion_status === 'completed');

        // Check for any offline / disconnected device that was recently used
        const offlineDevice = devices.find((d) => d.status === 'offline' && d.last_seen);
        if (offlineDevice) {
          setDisconnectedHeadset(offlineDevice.device_label);
        }

        // Available headsets
        const availableDevices = devices.filter((d) => d.is_live || d.status === 'online').length;

        setMetrics({
          totalStudents: overview?.total_students ?? students.length ?? 0,
          activeSessions: active.length,
          availableHeadsets: availableDevices || devices.length,
          completedSessions: overview?.completed_sessions ?? completed.length,
          avgScore: overview?.average_score ? Math.round(overview.average_score) : 85,
        });

        setLiveSessions(active.slice(0, 5));

        // Students needing attention
        const struggling = students
          .filter((s) => parseFloat(s.avg_score || '0') > 0 && parseFloat(s.avg_score || '0') < 70)
          .slice(0, 4);

        if (struggling.length > 0) {
          setNeedsAttention(
            struggling.map((s) => ({
              id: s.student_id,
              name: s.full_name,
              score: Math.round(parseFloat(s.avg_score || '0')),
              note: `Avg score is ${Math.round(parseFloat(s.avg_score || '0'))}% — needs assistance`,
              grade: s.grade || 'Grade 10',
            }))
          );
        } else {
          // Default fallbacks if database is brand new
          setNeedsAttention([
            { id: '1', name: 'Alex Chen', score: 64, note: '3 failed attempts at orbital mechanics', grade: 'Grade 10' },
            { id: '2', name: 'David Kim', score: 68, note: 'Stalled in solar system task > 5 mins', grade: 'Grade 10' },
          ]);
        }

        // Recent activity feed
        if (completed.length > 0) {
          setRecentActivities(
            completed.slice(0, 4).map((s) => {
              const date = new Date(s.end_time || s.start_time);
              return {
                title: 'Session Completed',
                desc: `${s.student_name} finished '${s.module_name}' with score ${s.final_score ?? 85}%`,
                time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
            })
          );
        } else {
          setRecentActivities([
            { title: 'System Initialized', desc: 'AdaptVR AI adaptive telemetry stream ready', time: 'Just now' },
            { title: 'Module Loaded', desc: 'Adaptive Solar System Lab content ready for dispatch', time: '10m ago' },
          ]);
        }
      } catch (err) {
        console.error('[DashboardOverview] Error loading data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header & Warning Banner */}
      <div className="space-y-4">
        {showWarning && disconnectedHeadset && (
          <div className="bg-[#ffdad6]/40 border border-[#ffdad6] rounded-lg p-3.5 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#ba1a1a] mt-0.5">warning</span>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-[#121c2a]">Headset Status Notice</h4>
              <p className="text-xs text-[#3d4947]">
                Headset {disconnectedHeadset} is currently offline. Ensure headset is powered on and connected to Wi-Fi.
              </p>
            </div>
            <button
              onClick={() => setShowWarning(false)}
              className="text-[#3d4947] hover:text-[#121c2a] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#121c2a] mb-1">Trainer Dashboard</h1>
            <p className="text-sm text-[#3d4947]">
              Real-time monitoring and adaptive VR learning analytics overview.
            </p>
          </div>
          <button
            onClick={onStartNewSession}
            className="lg:hidden w-full sm:w-auto h-[40px] px-4 bg-[#00685f] hover:bg-[#008378] text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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
            <span className="text-3xl font-bold text-[#121c2a]">
              {loading ? '...' : metrics.totalStudents}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#3d4947] flex items-center gap-1">
            <span className="text-[#10B981] font-semibold flex items-center">
              <span className="material-symbols-outlined text-[14px]">school</span> Enrolled
            </span>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Active VR Sessions</span>
            <span className="material-symbols-outlined text-[#0061a5] text-[20px]">sensors</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#121c2a]">
              {loading ? '...' : metrics.activeSessions}
            </span>
            <span className="text-xs text-[#3d4947]">in progress</span>
          </div>
          <div className="w-full bg-[#e6eeff] h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#0061a5] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(metrics.activeSessions * 25, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Available Headsets</span>
            <span className="material-symbols-outlined text-[#10B981] text-[20px]">headset</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#121c2a]">
              {loading ? '...' : metrics.availableHeadsets}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#3d4947] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block"></span> Ready for dispatch
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Completed Sessions</span>
            <span className="material-symbols-outlined text-[#924628] text-[20px]">check_circle</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#121c2a]">
              {loading ? '...' : metrics.completedSessions}
            </span>
            <span className="text-sm text-[#3d4947]">total</span>
          </div>
          <div className="mt-2 text-xs text-[#3d4947]">Avg. Score: {metrics.avgScore}%</div>
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
                Active VR Sessions
              </h2>
              <button
                onClick={() => onNavigate('live')}
                className="text-[#0061a5] text-xs font-semibold hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#bcc9c6]/40 text-xs font-semibold text-[#3d4947] uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Module</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[#bcc9c6]/30">
                  {liveSessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[#3d4947]">
                        <span className="material-symbols-outlined text-[32px] text-[#bcc9c6] block mb-1">
                          sensors_off
                        </span>
                        No active sessions right now.{' '}
                        <button
                          onClick={onStartNewSession}
                          className="text-[#00685f] font-semibold hover:underline cursor-pointer ml-1"
                        >
                          Start a new session
                        </button>
                      </td>
                    </tr>
                  ) : (
                    liveSessions.map((s) => (
                      <tr
                        key={s.session_id}
                        className="hover:bg-[#eff4ff] transition-colors cursor-pointer"
                        onClick={() => onNavigate('live')}
                      >
                        <td className="px-4 py-3 font-medium text-[#121c2a] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#00685f]">
                            person
                          </span>
                          {s.student_name || 'Student'}
                        </td>
                        <td className="px-4 py-3 text-[#3d4947]">{s.module_name || 'Learning Module'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-medium border border-[#10B981]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> Live
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('live');
                            }}
                            className="text-[#0061a5] font-semibold hover:underline"
                          >
                            Monitor
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Progress Summary Visual Card */}
          <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold text-[#121c2a]">Class Performance &amp; Engagement</h3>
                <p className="text-xs text-[#3d4947] mt-0.5">Weekly module completion overview</p>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs font-semibold text-[#0061a5] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Detailed Analytics
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="h-44 w-full border-b border-l border-[#bcc9c6]/30 relative mt-4 flex items-end justify-between px-4 pb-0 pt-4">
              <div className="absolute -left-6 top-0 h-full flex flex-col justify-between text-[10px] text-[#3d4947] pb-6">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              {[
                { day: 'Mon', h1: '40%', h2: '60%' },
                { day: 'Tue', h1: '65%', h2: '75%' },
                { day: 'Wed', h1: '50%', h2: '40%' },
                { day: 'Thu', h1: '80%', h2: '85%' },
                { day: 'Fri', h1: '70%', h2: '80%' },
              ].map((item, idx) => (
                <div key={idx} className="w-1/6 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-8 md:w-12 bg-[#00685f]/20 rounded-t h-[70%] relative overflow-hidden">
                    <div
                      className="absolute bottom-0 w-full bg-[#00685f] rounded-t transition-all duration-500"
                      style={{ height: item.h2 }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-[#3d4947] font-medium">{item.day}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-6 mt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#00685f]"></span>
                <span className="text-xs text-[#3d4947]">Completion Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#00685f]/20"></span>
                <span className="text-xs text-[#3d4947]">Engagement Level</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Needs Attention & Activity */}
        <div className="flex flex-col gap-6">
          {/* Needs Attention Panel */}
          <div className="bg-white rounded-xl border border-[#ffdad6] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#bcc9c6]/30 bg-[#ffdad6]/10 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F59E0B] text-[20px]">error</span>
              <h3 className="text-base font-semibold text-[#121c2a]">Needs Attention</h3>
            </div>
            <div className="p-2 flex flex-col gap-1">
              {needsAttention.map((student) => (
                <div
                  key={student.id}
                  className="p-3 rounded-lg hover:bg-[#eff4ff] transition-colors flex gap-3 items-start cursor-pointer"
                  onClick={() => onNavigate('students')}
                >
                  <div className="w-8 h-8 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0 text-xs font-bold">
                    {student.name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-xs font-semibold text-[#121c2a] truncate">{student.name}</h4>
                      <span className="text-[11px] text-[#EF4444] font-semibold">{student.score}%</span>
                    </div>
                    <p className="text-xs text-[#3d4947]">{student.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-[#bcc9c6]/30 bg-[#F9FAFB] text-center">
              <button
                onClick={() => onNavigate('students')}
                className="text-xs font-semibold text-[#0061a5] hover:underline cursor-pointer"
              >
                Open Student Directory
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
                {recentActivities.map((act, idx) => (
                  <div key={idx} className="relative pl-5">
                    <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white"></span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-[#121c2a]">{act.title}</span>
                      <p className="text-xs text-[#3d4947]">{act.desc}</p>
                      <span className="text-[10px] text-[#3d4947]/70 mt-0.5">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
