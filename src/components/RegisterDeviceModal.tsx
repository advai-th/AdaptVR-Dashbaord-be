import React, { useState } from 'react';
import { api } from '../services/api';
import { VRDevice } from '../types';

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceRegistered: (newDevice: VRDevice) => void;
}

interface DiscoveredHeadset {
  pairing_code: string;
  device_id?: string | null;
  device_label?: string;
  device_model: string;
  serial_number?: string | null;
  battery_level?: number | null;
  firmware_version?: string | null;
  connected_at?: string;
}

export const RegisterDeviceModal: React.FC<RegisterDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceRegistered,
}) => {
  // Step 1: Pairing Code | Step 2: Device Label
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [pairingCode, setPairingCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Discovered device info from Quest WebSocket
  const [discoveredHeadset, setDiscoveredHeadset] = useState<DiscoveredHeadset | null>(null);

  // Step 2 state
  const [deviceLabel, setDeviceLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep(1);
    setPairingCode('');
    setIsVerifying(false);
    setVerifyError(null);
    setDiscoveredHeadset(null);
    setDeviceLabel('');
    setIsSubmitting(false);
    setSubmitError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Auto-format pairing code with hyphen after 3 digits: e.g. 748-291
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 6);
    let formatted = digits;
    if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    setPairingCode(formatted);
    setVerifyError(null);
  };

  // Step 1: Verify pairing code entered by teacher
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    const cleanCode = pairingCode.trim().toUpperCase();
    if (!cleanCode) {
      setVerifyError('Please enter the 6-character pairing code shown inside the headset.');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await api.verifyPairingCode(cleanCode);
      if (result && result.found) {
        setDiscoveredHeadset(result);
        // Pre-fill a smart suggested label if the headset provided one or default
        const suggested = result.device_label && result.device_label !== 'Unknown Device' && result.device_label !== 'Quest Headset'
          ? result.device_label
          : `Quest-${cleanCode.replace(/[^A-Z0-9]/g, '').slice(-2) || '01'}`;
        setDeviceLabel(suggested);
        setStep(2);
      } else {
        setVerifyError(result?.error || 'No active headset found with this pairing code.');
      }
    } catch (err: any) {
      console.error('[RegisterDeviceModal] Verify code error:', err);
      setVerifyError(
        err.message || 'Headset not found. Make sure the Quest app is running and connected.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 2: Teacher enters label to complete registration
  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const trimmedLabel = deviceLabel.trim();
    if (!trimmedLabel) {
      setSubmitError('Please enter a device label so you can identify this headset.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newDevice = await api.registerDevice({
        device_label: trimmedLabel,
        pairing_code: discoveredHeadset?.pairing_code || pairingCode.trim().toUpperCase(),
        device_model: discoveredHeadset?.device_model,
        serial_number: discoveredHeadset?.serial_number || undefined,
        firmware_version: discoveredHeadset?.firmware_version || undefined,
      });

      onDeviceRegistered(newDevice);
      handleClose();
    } catch (err: any) {
      console.error('[RegisterDeviceModal] Registration failed:', err);
      setSubmitError(err.message || 'Failed to save headset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#121c2a]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#bcc9c6]/40 w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#bcc9c6]/30 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00685f]/10 text-[#00685f] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">
                {step === 1 ? 'pin' : 'badge'}
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#121c2a]">
                {step === 1 ? 'Connect VR Headset' : 'Name Your Headset'}
              </h3>
              <p className="text-xs text-[#3d4947]">
                {step === 1 ? 'Step 1 of 2: Enter Pairing Code' : 'Step 2 of 2: Assign Device Label'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isVerifying || isSubmitting}
            className="text-[#6d7a77] hover:text-[#121c2a] p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[#eff4ff]"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Progress Dots */}
        <div className="w-full bg-[#eff4ff] h-1 flex">
          <div
            className={`h-full bg-[#00685f] transition-all duration-300 ${
              step === 1 ? 'w-1/2' : 'w-full'
            }`}
          ></div>
        </div>

        {/* STEP 1: Enter Pairing Code */}
        {step === 1 && (
          <form onSubmit={handleVerifyCode} className="p-6 space-y-4 bg-[#F9FAFB]">
            {/* Helpful Guide */}
            <div className="p-3.5 rounded-xl bg-[#008378]/10 border border-[#008378]/25 flex items-start gap-3 text-xs text-[#00685f]">
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">headset</span>
              <div>
                <p className="font-semibold">Put on or look at the headset</p>
                <p className="text-[#3d4947] mt-0.5 leading-relaxed">
                  Launch the AdaptVR app on the Quest. It will display a unique 6-character pairing code on the screen (e.g. <span className="font-mono font-bold text-[#00685f]">748-291</span>).
                </p>
              </div>
            </div>

            {/* Error Message */}
            {verifyError && (
              <div className="p-3 rounded-lg bg-[#ffdad6] border border-[#ba1a1a] flex items-start gap-2 text-xs text-[#ba1a1a]">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span>{verifyError}</span>
              </div>
            )}

            {/* Pairing Code Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-[#3d4947] block text-center uppercase tracking-wider" htmlFor="pairingCode">
                Headset Pairing Code
              </label>
              <div className="relative max-w-xs mx-auto">
                <input
                  id="pairingCode"
                  type="text"
                  required
                  autoFocus
                  value={pairingCode}
                  onChange={handleCodeChange}
                  placeholder="e.g. 748-291"
                  maxLength={7}
                  className="w-full text-center text-2xl font-mono font-extrabold tracking-widest py-3 px-4 bg-white border-2 border-[#00685f]/40 rounded-xl text-[#121c2a] placeholder-[#bcc9c6] focus:outline-none focus:border-[#00685f] focus:ring-4 focus:ring-[#00685f]/15 transition-all uppercase"
                />
              </div>
              <p className="text-[11px] text-center text-[#6d7a77] mt-1">
                Hardware details (model, battery, firmware) are fetched automatically.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#eff4ff]">
              <button
                type="button"
                onClick={handleClose}
                disabled={isVerifying}
                className="px-4 py-2 rounded-lg border border-[#bcc9c6] text-[#3d4947] text-xs font-semibold hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying || !pairingCode.trim()}
                className="px-5 py-2.5 rounded-lg bg-[#00685f] hover:bg-[#008378] text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Device Label & Automatic Specs Confirmation */}
        {step === 2 && discoveredHeadset && (
          <form onSubmit={handleSaveDevice} className="p-6 space-y-4 bg-[#F9FAFB]">
            {/* Discovered Specs Card */}
            <div className="p-4 rounded-xl bg-white border border-[#10B981]/30 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping"></span>
                  <span className="text-xs font-bold text-[#10B981] uppercase tracking-wide">Headset Connected</span>
                </div>
                <span className="font-mono text-xs font-extrabold text-[#00685f] bg-[#008378]/10 px-2 py-0.5 rounded border border-[#008378]/20">
                  {discoveredHeadset.pairing_code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#eff4ff]">
                <div>
                  <span className="text-[11px] text-[#6d7a77] block">Model</span>
                  <span className="font-semibold text-[#121c2a] flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[16px] text-[#00685f]">view_in_ar</span>
                    {discoveredHeadset.device_model || 'Meta Quest 2'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6d7a77] block">Battery</span>
                  <span className="font-semibold text-[#121c2a] flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[16px] text-[#10B981]">battery_full</span>
                    {discoveredHeadset.battery_level != null ? `${discoveredHeadset.battery_level}%` : 'Online'}
                  </span>
                </div>
                {discoveredHeadset.firmware_version && (
                  <div>
                    <span className="text-[11px] text-[#6d7a77] block">Firmware</span>
                    <span className="font-mono font-medium text-[#121c2a] text-[11px] mt-0.5 block">
                      {discoveredHeadset.firmware_version}
                    </span>
                  </div>
                )}
                {discoveredHeadset.serial_number && (
                  <div>
                    <span className="text-[11px] text-[#6d7a77] block">Hardware S/N</span>
                    <span className="font-mono font-medium text-[#121c2a] text-[11px] mt-0.5 block truncate">
                      {discoveredHeadset.serial_number}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="p-3 rounded-lg bg-[#ffdad6] border border-[#ba1a1a] flex items-start gap-2 text-xs text-[#ba1a1a]">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* Device Label Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-[#3d4947] block" htmlFor="deviceLabel">
                Device Label <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bcc9c6] text-[18px]">
                  label
                </span>
                <input
                  id="deviceLabel"
                  type="text"
                  required
                  autoFocus
                  value={deviceLabel}
                  onChange={(e) => {
                    setDeviceLabel(e.target.value);
                    setSubmitError(null);
                  }}
                  placeholder="e.g. Quest-01, Lab-VR-A"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#bcc9c6] rounded-lg text-xs text-[#121c2a] placeholder-[#bcc9c6] focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-all font-semibold"
                />
              </div>
              <p className="text-[11px] text-[#6d7a77]">
                A recognizable nickname so you and other teachers can identify this physical headset in the classroom.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-[#eff4ff]">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-lg border border-[#bcc9c6] text-[#3d4947] text-xs font-semibold hover:bg-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !deviceLabel.trim()}
                className="px-5 py-2 rounded-lg bg-[#00685f] hover:bg-[#008378] text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Save Headset</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
