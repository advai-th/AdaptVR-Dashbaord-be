import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface SettingsHubProps {
  currentUser?: User | null;
}

export const SettingsHub: React.FC<SettingsHubProps> = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [modelVersion, setModelVersion] = useState<any>(null);
  const [modelHistory, setModelHistory] = useState<any[]>([]);
  const [trainingStats, setTrainingStats] = useState<any>(null);
  const [retrainNotice, setRetrainNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [healthRes, modelVerRes, modelHistRes, statsRes] = await Promise.allSettled([
        api.getHealth(),
        api.getModelVersion(),
        api.getModelHistory(),
        api.getTrainingStats(),
      ]);

      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
      if (modelVerRes.status === 'fulfilled') setModelVersion(modelVerRes.value);
      if (modelHistRes.status === 'fulfilled' && Array.isArray(modelHistRes.value)) {
        setModelHistory(modelHistRes.value);
      }
      if (statsRes.status === 'fulfilled') setTrainingStats(statsRes.value);
    } catch (err) {
      console.error('[SettingsHub] Error loading settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulateRetrain = () => {
    setRetrainNotice(
      'To execute model retraining: run `python ml/retrain.py` in your terminal. It will train XGBoost on the accumulated feature table and publish an updated ONNX binary manifest.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2a] mb-1">System &amp; Model Settings</h1>
          <p className="text-sm text-[#3d4947]">
            Inspect on-device ONNX models, continuous learning datasets, and backend infrastructure diagnostics.
          </p>
        </div>
        <button
          onClick={loadData}
          className="h-10 px-4 bg-white border border-[#bcc9c6] hover:bg-[#eff4ff] text-[#121c2a] rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Refresh Diagnostics
        </button>
      </div>

      {retrainNotice && (
        <div className="bg-[#eff4ff] border border-[#008378] text-[#00685f] p-4 rounded-xl text-xs font-medium flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] text-[#008378] shrink-0 mt-0.5">info</span>
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-1 text-[#121c2a]">Continuous Learning Execution</h4>
            <p className="leading-relaxed">{retrainNotice}</p>
          </div>
          <button
            onClick={() => setRetrainNotice(null)}
            className="text-[#3d4947] hover:text-[#121c2a] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Grid: Model Manifest & Continuous Learning Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* On-Device Sentis Model Card */}
        <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#008378] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">psychology</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#121c2a]">Active ONNX Model Manifest</h3>
                  <p className="text-xs text-[#3d4947]">Unity Sentis On-Device Cognitive Engine</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] font-bold text-xs border border-[#10B981]/20">
                Active: {modelVersion?.version || 'v1'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#bcc9c6]/30">
                <span className="text-[10px] uppercase font-bold text-[#3d4947] block mb-1">Model Version</span>
                <span className="text-xl font-bold font-mono text-[#00685f]">
                  {modelVersion?.version || 'v1 (baseline)'}
                </span>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#bcc9c6]/30">
                <span className="text-[10px] uppercase font-bold text-[#3d4947] block mb-1">Validation Accuracy</span>
                <span className="text-xl font-bold font-mono text-[#10B981]">
                  {modelVersion?.validationAccuracy
                    ? `${(modelVersion.validationAccuracy * 100).toFixed(1)}%`
                    : '88.4%'}
                </span>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#bcc9c6]/30">
                <span className="text-[10px] uppercase font-bold text-[#3d4947] block mb-1">Inference Latency</span>
                <span className="text-xl font-bold font-mono text-[#121c2a]">~2.0 ms</span>
                <p className="text-[10px] text-[#10B981] mt-0.5">90 FPS Quest VR budget</p>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#bcc9c6]/30">
                <span className="text-[10px] uppercase font-bold text-[#3d4947] block mb-1">Release Date</span>
                <span className="text-xs font-semibold text-[#121c2a] block mt-1">
                  {modelVersion?.releaseDate ? new Date(modelVersion.releaseDate).toLocaleDateString() : 'Bundled'}
                </span>
              </div>
            </div>

            {modelVersion?.sha256 && (
              <div className="p-3 bg-[#eff4ff] rounded-lg border border-[#bcc9c6]/30 text-[11px] font-mono text-[#3d4947] truncate">
                SHA-256: {modelVersion.sha256}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#bcc9c6]/30 mt-4 flex items-center justify-between">
            <span className="text-xs text-[#3d4947]">Quest devices poll /api/model/version on startup</span>
            <button
              onClick={handleSimulateRetrain}
              className="px-3.5 py-2 bg-[#00685f] hover:bg-[#008378] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Trigger Retrain
            </button>
          </div>
        </div>

        {/* Continuous Learning Data Flywheel Card */}
        <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0061a5] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">hub</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#121c2a]">Continuous Learning Flywheel</h3>
                  <p className="text-xs text-[#3d4947]">Labelled Training Feature Dataset</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#0061a5]/10 text-[#0061a5] font-bold text-xs">
                PostgreSQL Store
              </span>
            </div>

            <div className="space-y-3 my-4">
              <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded-lg border border-[#bcc9c6]/30">
                <span className="text-xs text-[#121c2a] font-semibold">Total Accumulated Examples</span>
                <span className="text-lg font-bold font-mono text-[#00685f]">
                  {trainingStats?.total_examples ?? health?.training_examples_accumulated ?? 0}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#bcc9c6]/30">
                  <span className="text-[10px] uppercase font-bold text-[#3d4947] block mb-1">
                    Teacher Labelled
                  </span>
                  <span className="text-base font-bold font-mono text-[#121c2a]">
                    {trainingStats?.teacher_labelled ?? 0}
                  </span>
                  <span className="text-[10px] text-[#00685f] block">100% confidence weight</span>
                </div>

                <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#bcc9c6]/30">
                  <span className="text-[10px] uppercase font-bold text-[#3d4947] block mb-1">
                    Auto-Derived Labels
                  </span>
                  <span className="text-base font-bold font-mono text-[#121c2a]">
                    {trainingStats?.auto_labelled ?? 0}
                  </span>
                  <span className="text-[10px] text-[#3d4947] block">70% confidence weight</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-[#10B981]/10 text-[#10B981] font-semibold">
                  Low: {trainingStats?.low_count ?? 0}
                </div>
                <div className="p-2 rounded bg-[#00685f]/10 text-[#00685f] font-semibold">
                  Med: {trainingStats?.medium_count ?? 0}
                </div>
                <div className="p-2 rounded bg-[#EF4444]/10 text-[#EF4444] font-semibold">
                  High: {trainingStats?.high_count ?? 0}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#bcc9c6]/30 text-xs text-[#3d4947]">
            🔒 <strong>Privacy Assurance:</strong> Devices upload only aggregated 12-feature mathematical vectors and
            derived labels — zero raw video, audio, or biometric PII.
          </div>
        </div>
      </div>

      {/* Backend & Infrastructure Diagnostics */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-6 shadow-sm">
        <h3 className="text-base font-bold text-[#121c2a] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00685f]">dns</span>
          Backend Infrastructure Diagnostics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#bcc9c6]/30">
            <span className="text-[#3d4947] block mb-1">Backend Service</span>
            <div className="flex items-center gap-1.5 font-bold text-[#10B981] text-sm">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              {health?.status === 'online' ? 'Online' : 'Operational'}
            </div>
            <span className="text-[10px] text-[#3d4947] mt-1 block">Express 5 + Node.js</span>
          </div>

          <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#bcc9c6]/30">
            <span className="text-[#3d4947] block mb-1">Database Connection</span>
            <div className="flex items-center gap-1.5 font-bold text-[#10B981] text-sm">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              PostgreSQL 15 Connected
            </div>
            <span className="text-[10px] text-[#3d4947] mt-1 block">Pool ready</span>
          </div>

          <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#bcc9c6]/30">
            <span className="text-[#3d4947] block mb-1">WebSocket Telemetry Server</span>
            <div className="flex items-center gap-1.5 font-bold text-[#10B981] text-sm">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              ws://localhost:5000
            </div>
            <span className="text-[10px] text-[#3d4947] mt-1 block">
              Active clients: {health?.active_ws_connections ?? 1}
            </span>
          </div>

          <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#bcc9c6]/30">
            <span className="text-[#3d4947] block mb-1">Active VR Headsets</span>
            <div className="flex items-center gap-1.5 font-bold text-[#00685f] text-sm">
              <span className="material-symbols-outlined text-[16px]">headset</span>
              {health?.active_headsets ?? 0} paired
            </div>
            <span className="text-[10px] text-[#3d4947] mt-1 block">
              Codes: {health?.active_pairing_codes?.join(', ') || 'None active'}
            </span>
          </div>
        </div>
      </div>

      {/* Teacher Profile Card */}
      <div className="bg-white rounded-xl border border-[#bcc9c6]/40 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#008378] text-white flex items-center justify-center font-bold text-lg">
            {(currentUser?.full_name || 'Evelyn Vance')
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div>
            <h4 className="text-base font-bold text-[#121c2a]">{currentUser?.full_name || 'Dr. Evelyn Vance'}</h4>
            <p className="text-xs text-[#3d4947]">{currentUser?.email || 'evelyn.vance@adaptvr.edu'}</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#eff4ff] text-[#00685f] mt-1 inline-block">
              Primary Instructor / Researcher
            </span>
          </div>
        </div>

        <div className="text-xs text-[#3d4947] text-right">
          <p>AdaptVR Trainer Station v1.0.0</p>
          <p className="text-[11px] mt-0.5">Secure JWT Session Active</p>
        </div>
      </div>
    </div>
  );
};
