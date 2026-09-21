import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { VRDevice } from '../types';
import { RegisterDeviceModal } from './RegisterDeviceModal';

interface HeadsetInventoryProps {
  onAssignDevice: (device: any) => void;
}

export const HeadsetInventory: React.FC<HeadsetInventoryProps> = ({ onAssignDevice }) => {
  const [devices, setDevices] = useState<VRDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Online' | 'In Session' | 'Offline'>('All');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDevices();
      setDevices(data);
    } catch (err: any) {
      console.error('[HeadsetInventory] Failed fetching devices:', err);
      setError(err.message || 'Failed to load device inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Show a temporary success toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleDeviceRegistered = (newDevice: VRDevice) => {
    setDevices((prev) => {
      // Avoid duplicate if already in list
      const exists = prev.some((d) => d.device_id === newDevice.device_id);
      if (exists) return prev;
      return [newDevice, ...prev];
    });
    showToast(`Headset "${newDevice.device_label}" was registered successfully!`);
  };

  const handleDeleteDevice = async (device: VRDevice) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove "${device.device_label}" from the inventory?`
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(device.device_id);
      await api.deleteDevice(device.device_id);
      setDevices((prev) => prev.filter((d) => d.device_id !== device.device_id));
      showToast(`Headset "${device.device_label}" removed from inventory.`);
    } catch (err: any) {
      alert(`Could not delete device: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Status mapping
  const getDeviceStatus = (d: VRDevice) => {
    if (d.is_live || d.status === 'online') return 'Online';
    if (d.status === 'in_session') return 'In Session';
    if (d.status === 'updating') return 'Updating';
    return 'Offline';
  };

  const filtered = devices.filter((d) => {
    const status = getDeviceStatus(d);
    if (filter === 'Online' && status !== 'Online') return false;
    if (filter === 'In Session' && status !== 'In Session') return false;
    if (filter === 'Offline' && status !== 'Offline') return false;

    const term = search.toLowerCase();
    const labelMatch = d.device_label?.toLowerCase().includes(term);
    const modelMatch = d.device_model?.toLowerCase().includes(term);
    const serialMatch = d.serial_number?.toLowerCase().includes(term);
    const pairingMatch = d.pairing_code?.toLowerCase().includes(term);

    return labelMatch || modelMatch || serialMatch || pairingMatch;
  });

  // Calculate stats
  const totalCount = devices.length;
  const onlineCount = devices.filter((d) => d.is_live || d.status === 'online').length;
  const inSessionCount = devices.filter((d) => d.status === 'in_session').length;
  const offlineCount = devices.filter((d) => !d.is_live && d.status !== 'online' && d.status !== 'in_session').length;

  const getBatteryIcon = (level?: number | null) => {
    if (level == null) return 'battery_unknown';
    if (level >= 90) return 'battery_full';
    if (level >= 60) return 'battery_5_bar';
    if (level >= 30) return 'battery_3_bar';
    if (level > 0) return 'battery_1_bar';
    return 'battery_alert';
  };

  const getBatteryColor = (level?: number | null) => {
    if (level == null) return 'text-[#9CA3AF]';
    if (level >= 50) return 'text-[#10B981]';
    if (level >= 20) return 'text-[#F59E0B]';
    return 'text-[#EF4444]';
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Not seen yet';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#00685f] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white ml-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2a]">Headset Inventory</h1>
          <p className="text-sm text-[#3d4947] mt-1">
            Manage and monitor {totalCount} registered VR {totalCount === 1 ? 'headset' : 'headsets'} in school hardware pool.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="p-2.5 bg-white border border-[#bcc9c6]/60 text-[#3d4947] rounded-lg text-xs font-semibold hover:bg-[#eff4ff] transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
            title="Refresh Inventory"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 h-10 bg-[#00685f] text-white rounded-lg text-xs font-semibold hover:bg-[#008378] transition-colors shadow-sm cursor-pointer w-full md:w-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Register Device</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#bcc9c6]/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Total Pool</p>
            <h3 className="text-2xl font-bold text-[#121c2a] mt-1">{totalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#00685f]/10 text-[#00685f] flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">headset</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#bcc9c6]/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#10B981] uppercase tracking-wider">Online / Ready</p>
            <h3 className="text-2xl font-bold text-[#121c2a] mt-1">{onlineCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">wifi</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#bcc9c6]/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#0061a5] uppercase tracking-wider">In Session</p>
            <h3 className="text-2xl font-bold text-[#121c2a] mt-1">{inSessionCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#0061a5]/10 text-[#0061a5] flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">cast_connected</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#bcc9c6]/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6d7a77] uppercase tracking-wider">Offline / Standby</p>
            <h3 className="text-2xl font-bold text-[#121c2a] mt-1">{offlineCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#eff4ff] text-[#6d7a77] flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">power_off</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Filter Pills */}
        <div className="flex bg-[#F9FAFB] border border-[#bcc9c6] rounded-lg p-1">
          {(['All', 'Online', 'In Session', 'Offline'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                filter === f ? 'bg-[#008378] text-white shadow-xs' : 'text-[#3d4947] hover:text-[#121c2a]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bcc9c6] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, model, serial..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#bcc9c6] rounded-lg text-xs text-[#121c2a] placeholder-[#bcc9c6] focus:outline-none focus:border-[#00685f]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6d7a77] hover:text-[#121c2a]"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && devices.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm animate-pulse space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-5 w-28 bg-[#eff4ff] rounded"></div>
                  <div className="h-3 w-20 bg-[#eff4ff] rounded"></div>
                </div>
                <div className="h-6 w-16 bg-[#eff4ff] rounded"></div>
              </div>
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#bcc9c6]/30">
                <div className="h-8 bg-[#eff4ff] rounded"></div>
                <div className="h-8 bg-[#eff4ff] rounded"></div>
                <div className="h-8 bg-[#eff4ff] rounded"></div>
                <div className="h-8 bg-[#eff4ff] rounded"></div>
              </div>
              <div className="h-7 w-20 bg-[#eff4ff] rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-[#ffdad6] border border-[#ba1a1a] flex items-center justify-between text-xs text-[#ba1a1a]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDevices}
            className="px-3 py-1 bg-[#ba1a1a] text-white rounded font-semibold hover:bg-[#93000a] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white border border-[#bcc9c6]/40 rounded-2xl p-12 text-center shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#00685f]/10 text-[#00685f] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[32px]">headset</span>
          </div>
          <h3 className="text-lg font-bold text-[#121c2a]">
            {search || filter !== 'All' ? 'No matching headsets found' : 'No headsets registered yet'}
          </h3>
          <p className="text-xs text-[#3d4947] mt-1.5 leading-relaxed">
            {search || filter !== 'All'
              ? 'Try changing your search filters or clear the search input.'
              : 'Register your school’s Meta Quest headsets to start pairing devices and launching adaptive learning modules.'}
          </p>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#00685f] text-white rounded-xl text-xs font-semibold hover:bg-[#008378] transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Register Headset</span>
          </button>
        </div>
      )}

      {/* Grid of Headset Cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((h) => {
            const status = getDeviceStatus(h);
            const isLive = h.is_live || status === 'Online';
            const isDeleting = deletingId === h.device_id;

            return (
              <article
                key={h.device_id}
                className={`bg-white border border-[#bcc9c6]/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4 relative ${
                  status === 'Offline' ? 'opacity-85' : ''
                }`}
              >
                <header className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-[#121c2a] flex items-center gap-2">
                      {h.device_label}
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          isLive
                            ? 'text-[#10B981]'
                            : status === 'In Session'
                            ? 'text-[#0061a5]'
                            : status === 'Updating'
                            ? 'text-[#00685f] animate-spin'
                            : 'text-[#9CA3AF]'
                        }`}
                        title={`Status: ${status}`}
                      >
                        {status === 'Updating' ? 'sync' : status === 'Offline' ? 'wifi_off' : 'wifi'}
                      </span>
                      {isLive && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"
                          title="Live WebSocket Connected"
                        ></span>
                      )}
                    </h3>

                    <p className="text-xs text-[#00685f] font-semibold mt-0.5">{h.device_model}</p>

                    {h.pairing_code ? (
                      <span className="inline-block mt-1 font-mono text-[11px] font-bold text-[#00685f] bg-[#008378]/10 px-2 py-0.5 rounded border border-[#008378]/20">
                        Pair Code: {h.pairing_code}
                      </span>
                    ) : h.serial_number ? (
                      <p className="text-[11px] font-mono text-[#6d7a77] mt-0.5">
                        S/N: {h.serial_number}
                      </p>
                    ) : (
                      <p className="text-[11px] font-mono text-[#6d7a77] mt-0.5">
                        ID: {h.device_id.slice(0, 8)}
                      </p>
                    )}
                  </div>

                  {status === 'Online' && (
                    <span className="px-2.5 py-1 rounded-md bg-[#10B981]/10 text-[#10B981] font-semibold text-xs border border-[#10B981]/20 shrink-0">
                      Online
                    </span>
                  )}
                  {status === 'In Session' && (
                    <span className="px-2.5 py-1 rounded-md bg-[#0061a5]/10 text-[#0061a5] font-semibold text-xs border border-[#0061a5]/20 shrink-0">
                      In Session
                    </span>
                  )}
                  {status === 'Offline' && (
                    <span className="px-2.5 py-1 rounded-md bg-[#9CA3AF]/10 text-[#6d7a77] font-semibold text-xs border border-[#bcc9c6] shrink-0">
                      Offline
                    </span>
                  )}
                  {status === 'Updating' && (
                    <span className="px-2.5 py-1 rounded-md bg-[#008378]/10 text-[#00685f] font-semibold text-xs border border-[#00685f]/20 shrink-0">
                      Updating...
                    </span>
                  )}
                </header>

                {/* Device Details Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 py-3 border-y border-[#bcc9c6]/30 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[#3d4947] text-[11px] font-semibold">Battery</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`material-symbols-outlined text-[18px] ${getBatteryColor(
                          h.battery_level
                        )}`}
                      >
                        {getBatteryIcon(h.battery_level)}
                      </span>
                      <span className="font-semibold text-[#121c2a]">
                        {h.battery_level != null ? `${h.battery_level}%` : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[#3d4947] text-[11px] font-semibold">Hardware</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="material-symbols-outlined text-[#00685f] text-[18px]">
                        view_in_ar
                      </span>
                      <span className="font-semibold text-[#121c2a] truncate" title={h.device_model}>
                        {h.device_model}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[#3d4947] text-[11px] font-semibold">Firmware</span>
                    <span className="text-[#121c2a] font-mono font-medium mt-0.5">
                      {h.firmware_version || 'v54.0.1'}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[#3d4947] text-[11px] font-semibold">Last Seen</span>
                    <span className="text-[#121c2a] font-medium mt-0.5 truncate" title={formatDate(h.last_seen || h.created_at)}>
                      {formatDate(h.last_seen || h.created_at)}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <footer className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onAssignDevice(h)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#00685f]/10 text-[#00685f] hover:bg-[#008378] hover:text-white transition-all cursor-pointer"
                  >
                    Assign Session
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteDevice(h)}
                      disabled={isDeleting}
                      className="p-1.5 text-[#6d7a77] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-md transition-colors cursor-pointer"
                      title="Remove device from inventory"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Register Device Modal */}
      <RegisterDeviceModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onDeviceRegistered={handleDeviceRegistered}
      />
    </div>
  );
};
