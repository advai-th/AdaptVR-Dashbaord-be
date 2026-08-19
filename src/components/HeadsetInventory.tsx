import React, { useState } from 'react';

interface HeadsetInventoryProps {
  onAssignDevice: (device: any) => void;
}

export const HeadsetInventory: React.FC<HeadsetInventoryProps> = ({ onAssignDevice }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const headsets = [
    {
      id: 'Quest-01',
      code: 'AVR-Q2-8831',
      status: 'Available',
      battery: '98%',
      batteryIcon: 'battery_full',
      batteryColor: 'text-[#10B981]',
      tracking: 'Optimal',
      software: 'v54.0.1',
      lastSeen: 'Just now',
    },
    {
      id: 'Quest-02',
      code: 'AVR-Q2-8832',
      status: 'In Session',
      student: 'Sarah J.',
      battery: '42%',
      batteryIcon: 'battery_4_bar',
      batteryColor: 'text-[#F59E0B]',
      tracking: 'Optimal',
      software: 'v54.0.1',
      currentApp: 'Biology 101 VR',
    },
    {
      id: 'Quest-03',
      code: 'AVR-Q2-8833',
      status: 'Disconnected',
      battery: 'Unknown',
      batteryIcon: 'battery_unknown',
      batteryColor: 'text-[#9CA3AF]',
      tracking: 'N/A',
      software: 'v53.2.0',
      lastSeen: '2 days ago',
    },
    {
      id: 'Quest-04',
      code: 'AVR-Q2-8834',
      status: 'Updating',
      progress: '34%',
      battery: '100%',
      batteryIcon: 'battery_charging_full',
      batteryColor: 'text-[#10B981]',
      tracking: 'Standby',
      software: 'v53.2.0 → v54.0.1',
    },
  ];

  const filtered = headsets.filter((h) => {
    if (filter === 'Available' && h.status !== 'Available') return false;
    if (filter === 'In Session' && h.status !== 'In Session') return false;
    if (filter === 'Disconnected' && h.status !== 'Disconnected') return false;
    return h.id.toLowerCase().includes(search.toLowerCase()) || h.code.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2a]">Headset Inventory</h1>
          <p className="text-sm text-[#3d4947] mt-1">Manage and monitor 24 registered devices in school hardware pool.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="flex bg-[#F9FAFB] border border-[#bcc9c6] rounded-lg p-1">
            {['All', 'Available', 'In Session', 'Disconnected'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  filter === f ? 'bg-[#008378] text-white' : 'text-[#3d4947]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 h-10 bg-[#00685f] text-white rounded-lg text-xs font-semibold hover:bg-[#008378]">
            <span className="material-symbols-outlined text-[18px]">add</span> Register Device
          </button>
        </div>
      </div>

      {/* Grid of Headset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((h) => (
          <article
            key={h.id}
            className={`bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4 ${
              h.status === 'Disconnected' ? 'opacity-75 grayscale-[20%]' : ''
            }`}
          >
            <header className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-[#121c2a] flex items-center gap-2">
                  {h.id}
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      h.status === 'Available'
                        ? 'text-[#10B981]'
                        : h.status === 'In Session'
                        ? 'text-[#0061a5]'
                        : h.status === 'Updating'
                        ? 'text-[#00685f] animate-spin'
                        : 'text-[#9CA3AF]'
                    }`}
                  >
                    {h.status === 'Updating' ? 'sync' : h.status === 'Disconnected' ? 'wifi_off' : 'wifi'}
                  </span>
                </h3>
                <p className="text-xs font-mono text-[#3d4947] mt-0.5">ID: {h.code}</p>
              </div>

              {h.status === 'Available' && (
                <span className="px-2 py-1 rounded bg-[#10B981]/10 text-[#10B981] font-semibold text-xs border border-[#10B981]/20">
                  Available
                </span>
              )}
              {h.status === 'In Session' && (
                <span className="px-2 py-1 rounded bg-[#0061a5]/10 text-[#0061a5] font-semibold text-xs border border-[#0061a5]/20">
                  In Session - {h.student}
                </span>
              )}
              {h.status === 'Disconnected' && (
                <span className="px-2 py-1 rounded bg-[#9CA3AF]/10 text-[#3d4947] font-semibold text-xs border border-[#bcc9c6]">
                  Disconnected
                </span>
              )}
              {h.status === 'Updating' && (
                <span className="px-2 py-1 rounded bg-[#008378]/10 text-[#00685f] font-semibold text-xs border border-[#00685f]/20">
                  Updating...
                </span>
              )}
            </header>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 py-3 border-y border-[#bcc9c6]/30 text-xs">
              <div className="flex flex-col">
                <span className="text-[#3d4947] text-[11px] font-semibold">Battery</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`material-symbols-outlined text-[18px] ${h.batteryColor}`}>{h.batteryIcon}</span>
                  <span className="font-semibold text-[#121c2a]">{h.battery}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[#3d4947] text-[11px] font-semibold">Tracking Quality</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="material-symbols-outlined text-[#00685f] text-[18px]">my_location</span>
                  <span className="font-semibold text-[#121c2a]">{h.tracking}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[#3d4947] text-[11px] font-semibold">Software</span>
                <span className="text-[#121c2a] font-medium mt-0.5">{h.software}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[#3d4947] text-[11px] font-semibold">
                  {h.currentApp ? 'Current App' : 'Last Seen'}
                </span>
                <span className="text-[#121c2a] font-medium mt-0.5">{h.currentApp || h.lastSeen}</span>
              </div>
            </div>

            <footer className="flex items-center justify-between pt-1">
              <button
                disabled={h.status !== 'Available'}
                onClick={() => onAssignDevice(h)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  h.status === 'Available'
                    ? 'text-[#00685f] hover:bg-[#008378]/10'
                    : 'text-[#bcc9c6] cursor-not-allowed'
                }`}
              >
                Assign
              </button>

              <div className="flex gap-1">
                <button className="p-1.5 text-[#3d4947] hover:bg-[#eff4ff] rounded-md" title="Diagnostics">
                  <span className="material-symbols-outlined text-[20px]">medical_services</span>
                </button>
                <button className="p-1.5 text-[#3d4947] hover:bg-[#eff4ff] rounded-md" title="History">
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </button>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
};
