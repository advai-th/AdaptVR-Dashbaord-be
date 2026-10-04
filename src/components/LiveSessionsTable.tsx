import React, { useState, useEffect, useCallback } from 'react';
import { api, connectTelemetryWebSocket } from '../services/api';

interface LiveSessionsTableProps {
  onSelectSession?: (session: any) => void;
  onViewMonitoring?: (session: any) => void;
  onStartNewSession?: () => void;
  onStartSession?: () => void;
}

export const LiveSessionsTable: React.FC<LiveSessionsTableProps> = ({
  onSelectSession,
  onViewMonitoring,
  onStartNewSession,
  onStartSession,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sessions, setSessions] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleView = onViewMonitoring || onSelectSession || (() => {});
  const handleStart = onStartNewSession || onStartSession;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsData, devicesData] = await Promise.allSettled([
        api.getSessions(),
        api.getDevices(),
      ]);

      if (sessionsData.status === 'fulfilled' && Array.isArray(sessionsData.value)) {
        setSessions(sessionsData.value);
      }
      if (devicesData.status === 'fulfilled' && Array.isArray(devicesData.value)) {
        setDevices(devicesData.value);
      }
    } catch (err) {
      console.error('[LiveSessionsTable] Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen for real-time WebSocket updates
    const ws = connectTelemetryWebSocket((payload) => {
      if (
        payload.type === 'session.started' ||
        payload.type === 'session.created' ||
        payload.type === 'session.ended' ||
        payload.type === 'device.connected' ||
        payload.type === 'device.disconnected'
      ) {
        loadData();
      }
    });

    return () => {
      if (ws) ws.close();
    };
  }, [loadData]);

  const handleEndSession = async (sessionId: string) => {
    const confirm = window.confirm('Are you sure you want to end this VR learning session?');
    if (!confirm) return;

    try {
      setActionInProgress(sessionId);
      await api.endSession(sessionId, {
        final_score: 85,
        completion_status: 'completed',
      });
      await loadData();
    } catch (err: any) {
      alert(`Could not end session: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const activeSessions = sessions.filter((s) => s.completion_status === 'in_progress');
  const completedSessions = sessions.filter((s) => s.completion_status === 'completed');
  const onlineDevicesCount = devices.filter((d) => d.is_live || d.status === 'online').length;

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'active') return s.completion_status === 'in_progress';
    if (filter === 'completed') return s.completion_status === 'completed';
    return true;
  });

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!startTime) return '--:--';
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const diffMins = Math.max(0, Math.floor((end - start) / 60000));
    const diffSecs = Math.max(0, Math.floor(((end - start) % 60000) / 1000));
    return `${diffMins}m ${diffSecs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2a] mb-1">Live VR Sessions</h1>
          <p className="text-sm text-[#3d4947]">
            Monitor active headset telemetry, learner progress, and session events in real time.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex bg-[#F9FAFB] border border-[#bcc9c6] rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                filter === 'all' ? 'bg-[#008378] text-white shadow-sm' : 'text-[#3d4947] hover:bg-slate-200/50'
              }`}
            >
              All ({sessions.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                filter === 'active' ? 'bg-[#008378] text-white shadow-sm' : 'text-[#3d4947] hover:bg-slate-200/50'
              }`}
            >
              Live Active ({activeSessions.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                filter === 'completed' ? 'bg-[#008378] text-white shadow-sm' : 'text-[#3d4947] hover:bg-slate-200/50'
              }`}
            >
              Completed ({completedSessions.length})
            </button>
          </div>
          {handleStart && (
            <button
              onClick={handleStart}
              className="h-[40px] px-4 bg-[#00685f] hover:bg-[#008378] text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Start Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-2">Total Devices</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-[#121c2a]">{devices.length || 2}</h3>
            <span className="text-xs text-[#10B981] font-semibold">{onlineDevicesCount} online</span>
          </div>
        </div>

        <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-2">Active Sessions</p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold text-[#10B981]">{activeSessions.length}</h3>
            {activeSessions.length > 0 && (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-2">Completed Today</p>
          <h3 className="text-3xl font-bold text-[#0061a5]">{completedSessions.length}</h3>
        </div>

        <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-2">Adaptive Model</p>
          <h3 className="text-xl font-bold text-[#121c2a] mt-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#008378]">psychology</span>
            XGBoost v1
          </h3>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white border border-[#bcc9c6]/40 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#eff4ff] border-b border-[#bcc9c6]/40">
              <tr>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947]">Student</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947]">Status</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947]">Module</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947]">Telemetry &amp; Score</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947]">Duration</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bcc9c6]/30 text-xs">
              {loading && sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#3d4947]">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading sessions...
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#3d4947]">
                    <span className="material-symbols-outlined text-[36px] text-[#bcc9c6] block mb-2">
                      sensors_off
                    </span>
                    No sessions match this filter.{' '}
                    {handleStart && (
                      <button
                        onClick={handleStart}
                        className="text-[#00685f] font-semibold hover:underline ml-1 cursor-pointer"
                      >
                        Start a new session
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const isActive = s.completion_status === 'in_progress';
                  const isCompleted = s.completion_status === 'completed';

                  return (
                    <tr
                      key={s.session_id}
                      className={`hover:bg-[#eff4ff]/60 transition-colors ${
                        isActive ? 'border-l-4 border-l-[#10B981]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#121c2a] flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#008378] text-white flex items-center justify-center font-bold text-[11px]">
                            {(s.student_name || 'S')
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <div>{s.student_name || 'Alex Chen'}</div>
                            <div className="text-[#3d4947] text-[11px] font-normal">
                              {s.student_grade || 'Grade 10'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] font-semibold border border-[#10B981]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span> Active
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0061a5]/10 text-[#0061a5] font-semibold border border-[#0061a5]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0061a5]"></span> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] font-semibold border border-[#F59E0B]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span> {s.completion_status}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#121c2a]">{s.module_name || 'Solar System'}</div>
                        <div className="text-[#3d4947] text-[11px]">{s.module_category || 'Science'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 text-[11px] text-[#3d4947]">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Events:</span>
                            <span className="font-semibold text-[#121c2a]">{s.event_count ?? 0}</span>
                          </div>
                          {s.final_score != null ? (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Score:</span>
                              <span className="font-bold text-[#008378]">{s.final_score}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[#10B981]">
                              <span className="material-symbols-outlined text-[14px]">psychology</span>
                              <span>{s.latest_cognitive_load || 'Adaptive Active'}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#3d4947]">
                        {formatDuration(s.start_time, s.end_time)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            onClick={() =>
                              handleView({
                                session_id: s.session_id,
                                id: s.session_id,
                                studentName: s.student_name,
                                student: s.student_name,
                                moduleName: s.module_name,
                                module: s.module_name,
                                deviceId: 'Quest-02',
                                status: isActive ? 'Active' : s.completion_status,
                                startTime: s.start_time,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#008378]/10 text-[#008378] hover:bg-[#008378] hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                            title="Open Monitoring & Telemetry"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            <span>{isActive ? 'Monitor Live' : 'View Replay'}</span>
                          </button>

                          {isActive && (
                            <button
                              onClick={() => handleEndSession(s.session_id)}
                              disabled={actionInProgress === s.session_id}
                              className="p-1.5 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer border border-[#EF4444]/30"
                              title="End Session"
                            >
                              <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#bcc9c6]/40 bg-[#F9FAFB]">
          <span className="text-xs text-[#3d4947]">
            Showing {filteredSessions.length} recorded sessions
          </span>
          <button
            onClick={loadData}
            className="text-xs text-[#00685f] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh List
          </button>
        </div>
      </div>
    </div>
  );
};
