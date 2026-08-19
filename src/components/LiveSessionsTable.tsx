import React, { useState } from 'react';

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
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'disconnected'>('all');
  const handleView = onViewMonitoring || onSelectSession || (() => {});
  const handleStart = onStartNewSession || onStartSession;

  const sessions = [
    {
      id: 'Quest-01',
      deviceCode: '8F3A-99B',
      status: 'Active',
      student: 'Alex Chen',
      module: 'Solar System',
      task: 'Planet Placement',
      duration: '12:45',
      battery: '85%',
      tracking: 'Good',
      batteryIcon: 'battery_5_bar'
    },
    {
      id: 'Vive-12',
      deviceCode: '4C22-11A',
      status: 'Active',
      student: 'Marcus Chen',
      module: 'Physics: Gravity',
      task: 'Freefall Calculation',
      duration: '08:15',
      battery: '90%',
      tracking: 'Good',
      batteryIcon: 'battery_full'
    },
    {
      id: 'Quest-04',
      deviceCode: '8F3A-12C',
      status: 'Paused',
      student: 'Sarah Jenkins',
      module: 'Cell Biology',
      task: 'Mitosis Observation',
      duration: '08:20',
      battery: '62%',
      tracking: 'Fair',
      batteryIcon: 'battery_4_bar'
    },
    {
      id: 'Quest-12',
      deviceCode: '8F3A-44X',
      status: 'Disconnected',
      student: 'Marcus Todd',
      module: 'Unknown',
      task: 'Last: Solar System',
      duration: '--:--',
      battery: '12%',
      tracking: 'Lost',
      batteryIcon: 'battery_1_bar'
    },
    {
      id: 'Oculus-08',
      deviceCode: '9K11-00P',
      status: 'Active',
      student: 'David Kim',
      module: 'Anatomy Basics',
      task: 'Skeletal Assembly',
      duration: '22:01',
      battery: '74%',
      tracking: 'Good',
      batteryIcon: 'battery_4_bar'
    }
  ];

  const filteredSessions = sessions.filter(s => {
    if (filter === 'active') return s.status === 'Active';
    if (filter === 'paused') return s.status === 'Paused';
    if (filter === 'disconnected') return s.status === 'Disconnected';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2a] mb-1">Live Sessions</h1>
          <p className="text-sm text-[#3d4947]">Monitoring 24 active devices in Science Lab 3.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-[#F9FAFB] border border-[#bcc9c6] rounded-lg p-1">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded ${filter === 'all' ? 'bg-[#008378] text-white' : 'text-[#3d4947]'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('active')}
              className={`px-3 py-1 text-xs font-semibold rounded ${filter === 'active' ? 'bg-[#008378] text-white' : 'text-[#3d4947]'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setFilter('paused')}
              className={`px-3 py-1 text-xs font-semibold rounded ${filter === 'paused' ? 'bg-[#008378] text-white' : 'text-[#3d4947]'}`}
            >
              Paused
            </button>
          </div>
          {handleStart && (
            <button 
              onClick={handleStart}
              className="h-[40px] px-4 bg-[#00685f] hover:bg-[#008378] text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Start Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#3d4947] mb-2">Total Devices</p>
          <h3 className="text-3xl font-bold text-[#121c2a]">32</h3>
        </div>
        <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#3d4947] mb-2">Active Sessions</p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold text-[#10B981]">24</h3>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
            </span>
          </div>
        </div>
        <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#3d4947] mb-2">Paused</p>
          <h3 className="text-3xl font-bold text-[#F59E0B]">5</h3>
        </div>
        <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#3d4947] mb-2">Disconnected</p>
          <h3 className="text-3xl font-bold text-[#EF4444]">3</h3>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white border border-[#bcc9c6]/40 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#eff4ff] border-b border-[#bcc9c6]/40">
              <tr>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947]">Headset / ID</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947]">Status</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947]">Student</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947]">Module &amp; Task</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947]">Metrics</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-[#3d4947] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bcc9c6]/30 text-xs">
              {filteredSessions.map((s) => (
                <tr 
                  key={s.id}
                  className={`hover:bg-[#eff4ff]/60 transition-colors ${
                    s.status === 'Disconnected' ? 'border-l-4 border-l-[#EF4444]' : ''
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#121c2a]">{s.id}</div>
                    <div className="text-[#3d4947] text-[11px]">ID: {s.deviceCode}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    {s.status === 'Active' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> Active
                      </span>
                    )}
                    {s.status === 'Paused' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span> Paused
                      </span>
                    )}
                    {s.status === 'Disconnected' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EF4444]/10 text-[#EF4444] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span> Disconnected
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-medium text-[#121c2a]">{s.student}</td>

                  <td className="py-3.5 px-4">
                    <div className="font-medium text-[#121c2a]">{s.module}</div>
                    <div className="text-[#3d4947] text-[11px]">{s.task}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1 text-[11px] text-[#3d4947]">
                      <div className="flex justify-between w-24">
                        <span>Dur:</span> <span className="font-mono">{s.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-[#10B981]">{s.batteryIcon}</span> 
                        {s.battery}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">track_changes</span> 
                        {s.tracking}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleView(s)}
                        className="p-1.5 rounded text-[#00685f] hover:bg-[#008378]/10 transition-colors"
                        title="View Telemetry Monitoring"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      {s.status === 'Active' && (
                        <button className="p-1.5 rounded text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors" title="Pause">
                          <span className="material-symbols-outlined text-[20px]">pause</span>
                        </button>
                      )}
                      {s.status === 'Paused' && (
                        <button className="p-1.5 rounded text-[#10B981] hover:bg-[#10B981]/10 transition-colors" title="Resume">
                          <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                        </button>
                      )}
                      {s.status === 'Disconnected' && (
                        <button className="h-7 px-2.5 rounded text-[#EF4444] border border-[#EF4444]/30 hover:bg-[#EF4444]/10 text-xs font-semibold">
                          Reconnect
                        </button>
                      )}
                      {s.status !== 'Disconnected' && (
                        <button className="p-1.5 rounded text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors" title="End Session">
                          <span className="material-symbols-outlined text-[20px]">stop</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#bcc9c6]/40 bg-[#F9FAFB]">
          <span className="text-xs text-[#3d4947]">Showing {filteredSessions.length} of 32 devices</span>
          <div className="flex gap-1">
            <button className="p-1 rounded text-[#3d4947] hover:bg-[#e6eeff] disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="p-1 rounded text-[#3d4947] hover:bg-[#e6eeff]">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
