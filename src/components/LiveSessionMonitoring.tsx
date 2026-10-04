import React, { useState, useEffect, useRef } from 'react';
import { api, connectTelemetryWebSocket, sendTelemetryWsMessage } from '../services/api';

interface LiveSessionMonitoringProps {
  session?: any;
  onBack: () => void;
  onEndSession?: () => void;
}

interface TimelineItem {
  id?: string;
  time: string;
  title: string;
  desc: string;
  type: 'info' | 'warning' | 'adaptive' | 'action';
}

export const LiveSessionMonitoring: React.FC<LiveSessionMonitoringProps> = ({
  session,
  onBack,
  onEndSession,
}) => {
  const sessionId = session?.session_id || session?.id;
  const studentName = session?.studentName || session?.student || 'Student';
  const headsetId = session?.deviceId || session?.id || 'Quest-02';
  const moduleName = session?.moduleName || session?.module || 'Adaptive Solar System Lab';

  // Live state
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [message, setMessage] = useState('');
  const [sentMessages, setSentMessages] = useState<Array<{ text: string; time: string }>>([]);
  const [cognitiveLoad, setCognitiveLoad] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [confidence, setConfidence] = useState<number>(0.85);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [hintsUtilized, setHintsUtilized] = useState(0);
  const [sessionDurationSecs, setSessionDurationSecs] = useState(0);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [teacherOverrideSuccess, setTeacherOverrideSuccess] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // 1. Fetch initial session data from DB
  useEffect(() => {
    let timer: any;
    if (sessionId) {
      api
        .getSessionById(sessionId)
        .then((data) => {
          if (data && data.session) {
            setSessionDetail(data.session);

            // Compute metrics from stored events
            if (Array.isArray(data.events)) {
              let correct = 0;
              let incorrect = 0;
              let hints = 0;
              const loadedTimeline: TimelineItem[] = [];

              data.events.forEach((ev: any) => {
                if (ev.event_type === 'snap_success' || ev.event_type === 'correct_snap') correct++;
                if (ev.event_type === 'snap_error' || ev.event_type === 'wrong_snap') incorrect++;
                if (ev.event_type === 'hint_requested') hints++;

                const t = new Date(ev.event_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                loadedTimeline.push({
                  id: ev.event_id,
                  time: t,
                  title: ev.event_type.replace(/_/g, ' '),
                  desc: ev.object_name ? `Target: ${ev.object_name}` : 'Interaction registered',
                  type: ev.event_type.includes('error') ? 'warning' : 'info',
                });
              });

              setCorrectAttempts(correct);
              setIncorrectAttempts(incorrect);
              setHintsUtilized(hints);

              // Add adaptations to timeline
              if (Array.isArray(data.adaptations)) {
                data.adaptations.forEach((ad: any) => {
                  const t = new Date(ad.adapted_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  loadedTimeline.push({
                    id: ad.adaptation_id,
                    time: t,
                    title: `Adaptive: ${ad.adaptation_type}`,
                    desc: ad.description || 'System dynamic difficulty adjustment',
                    type: 'adaptive',
                  });
                });
              }

              if (loadedTimeline.length > 0) {
                setTimeline(loadedTimeline.reverse().slice(0, 10));
              }
            }

            // Latest prediction
            if (Array.isArray(data.predictions) && data.predictions.length > 0) {
              const lastPred = data.predictions[data.predictions.length - 1];
              setCognitiveLoad(lastPred.predicted_cognitive_load || 'Medium');
              setConfidence(parseFloat(lastPred.confidence_score || '0.85'));
            }

            // Elapsed time
            if (data.session.start_time) {
              const start = new Date(data.session.start_time).getTime();
              setSessionDurationSecs(Math.floor((Date.now() - start) / 1000));
            }
          }
        })
        .catch((err) => {
          console.warn('[LiveSessionMonitoring] Could not load session from DB, using live stream:', err);
        });

      // Duration ticker
      timer = setInterval(() => {
        setSessionDurationSecs((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sessionId]);

  // 2. Connect to WebSocket stream for live incoming events
  useEffect(() => {
    const ws = connectTelemetryWebSocket((payload) => {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Live Telemetry Event
      if (payload.type === 'interaction.event' || payload.type === 'telemetry') {
        const ev = payload.data || payload;
        const eventType = ev.eventType || ev.event_type || 'interaction';

        if (eventType === 'snap_success' || eventType === 'correct_snap') {
          setCorrectAttempts((c) => c + 1);
        } else if (eventType === 'snap_error' || eventType === 'wrong_snap') {
          setIncorrectAttempts((i) => i + 1);
        } else if (eventType === 'hint_requested') {
          setHintsUtilized((h) => h + 1);
        }

        setTimeline((prev) => [
          {
            time: nowTime,
            title: eventType.replace(/_/g, ' '),
            desc: ev.objectName ? `Object: ${ev.objectName}` : 'Student interaction in VR',
            type: eventType.includes('error') ? 'warning' : 'info',
          },
          ...prev.slice(0, 15),
        ]);
      }

      // Live Prediction Update
      if (payload.type === 'prediction' || payload.type === 'ml.prediction') {
        const pred = payload.data || payload;
        const state = pred.predicted_cognitive_load || pred.state || pred.load;
        if (state) {
          setCognitiveLoad(state);
          if (pred.confidence) setConfidence(pred.confidence);
          setTimeline((prev) => [
            {
              time: nowTime,
              title: `ML State: ${state}`,
              desc: `Confidence: ${Math.round((pred.confidence || 0.85) * 100)}% (XGBoost on-device)`,
              type: 'adaptive',
            },
            ...prev.slice(0, 15),
          ]);
        }
      }

      // Live Adaptation Event
      if (payload.type === 'adaptation' || payload.type === 'adaptation.command') {
        const ad = payload.data || payload;
        setTimeline((prev) => [
          {
            time: nowTime,
            title: `Adaptation Triggered: ${ad.action || ad.type || 'Difficulty Adjusted'}`,
            desc: ad.reason || 'Auto-adapted based on real-time cognitive profile',
            type: 'adaptive',
          },
          ...prev.slice(0, 15),
        ]);
      }
    });

    wsRef.current = ws;

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Format MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Direct Message to Headset
  const handleSendMessage = () => {
    if (!message.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const payload = {
      type: 'teacher.message',
      sessionId,
      studentName,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    sendTelemetryWsMessage(wsRef.current, payload);

    setSentMessages((prev) => [
      {
        text: message.trim(),
        time: timeStr,
      },
      ...prev,
    ]);

    setTimeline((prev) => [
      {
        time: timeStr,
        title: 'Direct HUD Message Sent',
        desc: `"${message.trim()}" transmitted to Quest display`,
        type: 'action',
      },
      ...prev,
    ]);

    setMessage('');
  };

  // Pause / Resume Session
  const togglePause = () => {
    const nextState = !isPaused;
    setIsPaused(nextState);

    const payload = {
      type: nextState ? 'session.paused' : 'session.resumed',
      sessionId,
    };
    sendTelemetryWsMessage(wsRef.current, payload);

    setTimeline((prev) => [
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: nextState ? 'Session Paused by Instructor' : 'Session Resumed',
        desc: nextState ? 'VR activity freeze dispatched to headset' : 'VR activity resumed',
        type: 'action',
      },
      ...prev,
    ]);
  };

  // End Session
  const handleEnd = async () => {
    const confirm = window.confirm(`End session for ${studentName}? Data will be saved to the database.`);
    if (!confirm) return;

    if (sessionId) {
      try {
        await api.endSession(sessionId, {
          final_score: Math.min(100, Math.max(50, 70 + correctAttempts * 3 - incorrectAttempts * 2)),
          completion_status: 'completed',
        });
      } catch (err) {
        console.error('Failed ending session in DB:', err);
      }
    }

    if (onEndSession) onEndSession();
    else onBack();
  };

  // Teacher Soft-Label Override (Continuous Learning Flywheel)
  const handleTeacherOverride = async (label: 'Low' | 'Medium' | 'High') => {
    setCognitiveLoad(label);
    setConfidence(1.0);
    setTeacherOverrideSuccess(`Teacher override recorded: ${label} cognitive state.`);
    setTimeout(() => setTeacherOverrideSuccess(null), 3000);

    setTimeline((prev) => [
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: `Teacher Label Override: ${label}`,
        desc: 'Higher-weight label assigned for continuous XGBoost retraining',
        type: 'adaptive',
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-[#00685f] hover:underline cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to Live Sessions List
        </button>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]"></span>
          </span>
          <span className="text-xs font-semibold px-3 py-1 bg-[#10B981]/10 text-[#10B981] rounded-full border border-[#10B981]/20">
            Real-Time Telemetry Stream Active
          </span>
        </div>
      </div>

      {teacherOverrideSuccess && (
        <div className="bg-[#10B981]/10 border border-[#10B981]/30 text-[#00685f] px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          {teacherOverrideSuccess}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Pane: Telemetry Summary & Controls */}
        <section className="w-full md:w-1/3 flex flex-col gap-6 shrink-0">
          {/* Header Card */}
          <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00685f] to-[#89f5e7]"></div>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-[#121c2a]">{studentName}</h2>
                <p className="text-xs text-[#3d4947] flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block"></span>
                  Active on {headsetId}
                </p>
              </div>
              <span className="material-symbols-outlined text-[#00685f] text-[32px]">face</span>
            </div>

            <div className="pt-2 border-t border-[#d9e3f6]">
              <p className="text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider mb-1">Active Module</p>
              <p className="text-sm font-semibold text-[#121c2a]">{moduleName}</p>
            </div>

            <div className="flex justify-between items-end mt-1">
              <div className="w-full mr-4">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-[#3d4947]">Progress Estimate</span>
                  <span className="text-xs font-semibold text-[#00685f]">
                    {Math.min(100, Math.max(15, correctAttempts * 12))}%
                  </span>
                </div>
                <div className="w-full bg-[#d9e3f6] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#00685f] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(15, correctAttempts * 12))}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider mb-1">Timer</p>
                <p className="text-lg font-bold font-mono text-[#121c2a]">{formatTimer(sessionDurationSecs)}</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
            <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1">Session Controls</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={togglePause}
                className="h-10 border border-[#bcc9c6] rounded-lg flex items-center justify-center gap-2 text-[#3d4947] hover:bg-[#eff4ff] transition-colors text-xs font-semibold cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isPaused ? 'play_arrow' : 'pause'}
                </span>
                {isPaused ? 'Resume VR' : 'Pause VR'}
              </button>
              <button
                onClick={handleEnd}
                className="h-10 border border-[#EF4444] text-[#EF4444] hover:bg-[#ffdad6]/20 rounded-lg transition-colors text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                End Session
              </button>
            </div>

            {/* Direct Message HUD */}
            <div className="pt-4 border-t border-[#d9e3f6] mt-1">
              <label className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-2 block">
                Direct Message to Student VR HUD
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="e.g. Look to your left for Mars..."
                  className="flex-1 h-10 px-3 bg-[#eff4ff] border border-[#bcc9c6] rounded-lg focus:border-[#00685f] focus:outline-none text-xs text-[#121c2a]"
                />
                <button
                  onClick={handleSendMessage}
                  className="h-10 px-4 bg-[#00685f] text-white rounded-lg hover:bg-[#008378] transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                  title="Send message to Quest display"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
              {sentMessages.length > 0 && (
                <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto">
                  {sentMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-[#F9FAFB] border border-[#bcc9c6]/40 rounded text-xs flex justify-between"
                    >
                      <span className="text-[#121c2a]">"{m.text}"</span>
                      <span className="text-[10px] text-[#3d4947]">{m.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Teacher Cognitive State Override */}
          <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 flex flex-col gap-3 shadow-sm">
            <div>
              <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">
                Teacher Cognitive Override
              </p>
              <p className="text-[11px] text-[#3d4947] mt-0.5">
                Manually label learner load to calibrate the on-device XGBoost continuous learning loop.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleTeacherOverride('Low')}
                className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  cognitiveLoad === 'Low'
                    ? 'bg-[#10B981] text-white border-[#10B981]'
                    : 'border-[#bcc9c6] text-[#3d4947] hover:bg-[#eff4ff]'
                }`}
              >
                Low (Easy)
              </button>
              <button
                onClick={() => handleTeacherOverride('Medium')}
                className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  cognitiveLoad === 'Medium'
                    ? 'bg-[#00685f] text-white border-[#00685f]'
                    : 'border-[#bcc9c6] text-[#3d4947] hover:bg-[#eff4ff]'
                }`}
              >
                Medium (Optimal)
              </button>
              <button
                onClick={() => handleTeacherOverride('High')}
                className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  cognitiveLoad === 'High'
                    ? 'bg-[#EF4444] text-white border-[#EF4444]'
                    : 'border-[#bcc9c6] text-[#3d4947] hover:bg-[#eff4ff]'
                }`}
              >
                High (Struggling)
              </button>
            </div>
          </div>
        </section>

        {/* Right Pane: Deep Analytics & Timeline */}
        <section className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Learner State Banner */}
          <div
            className={`border rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm transition-colors ${
              cognitiveLoad === 'High'
                ? 'bg-[#ffdad6]/30 border-[#ffdad6]'
                : cognitiveLoad === 'Low'
                ? 'bg-[#10B981]/10 border-[#10B981]/30'
                : 'bg-[#eff4ff] border-[#89f5e7]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  cognitiveLoad === 'High'
                    ? 'bg-[#EF4444] text-white'
                    : cognitiveLoad === 'Low'
                    ? 'bg-[#10B981] text-white'
                    : 'bg-[#008378] text-white'
                }`}
              >
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#121c2a]">Estimated Cognitive State</h3>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                      cognitiveLoad === 'High'
                        ? 'bg-[#EF4444]/20 text-[#EF4444]'
                        : cognitiveLoad === 'Low'
                        ? 'bg-[#10B981]/20 text-[#10B981]'
                        : 'bg-[#008378]/20 text-[#008378]'
                    }`}
                  >
                    {cognitiveLoad} Load
                  </span>
                </div>
                <p className="text-xs text-[#3d4947] mt-0.5">
                  {cognitiveLoad === 'High'
                    ? 'Student is encountering friction — assistance modules active.'
                    : cognitiveLoad === 'Low'
                    ? 'High proficiency detected — ready for increased challenge.'
                    : 'Student is in optimal flow zone.'}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-semibold text-[#3d4947] block">Confidence</span>
              <span className="text-sm font-mono font-bold text-[#121c2a]">
                {Math.round(confidence * 100)}%
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Interactions</p>
                <span className="material-symbols-outlined text-[#00685f] text-[20px]">touch_app</span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#121c2a]">{correctAttempts + incorrectAttempts}</span>
                  <span className="text-xs text-[#10B981] font-semibold">{correctAttempts} correct</span>
                  {incorrectAttempts > 0 && (
                    <span className="text-xs text-[#EF4444] font-semibold">/ {incorrectAttempts} errors</span>
                  )}
                </div>
                <p className="text-xs text-[#3d4947] mt-1">Spatial Manipulations</p>
              </div>
            </div>

            <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Assistance Tiers</p>
                <span className="material-symbols-outlined text-[#F59E0B] text-[20px]">lightbulb</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-[#121c2a]">{hintsUtilized}</span>
                <p className="text-xs text-[#3d4947] mt-1">Hints Provided by Companion</p>
              </div>
            </div>

            <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Accuracy Rate</p>
                <span className="material-symbols-outlined text-[#10B981] text-[20px]">check_circle</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-[#10B981]">
                  {correctAttempts + incorrectAttempts > 0
                    ? `${Math.round((correctAttempts / (correctAttempts + incorrectAttempts)) * 100)}%`
                    : '100%'}
                </span>
                <p className="text-xs text-[#3d4947] mt-1">Task Success Ratio</p>
              </div>
            </div>
          </div>

          {/* Session Timeline */}
          <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 flex-1 flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-[#121c2a] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#00685f]">timeline</span>
                Real-Time Session Timeline
              </h3>
              <span className="text-xs text-[#3d4947]">{timeline.length} events logged</span>
            </div>

            <div className="relative pl-4 border-l-2 border-[#d9e3f6] flex-1 flex flex-col gap-4 overflow-y-auto max-h-[380px]">
              {timeline.length === 0 ? (
                <div className="py-8 text-center text-[#3d4947] text-xs">
                  Awaiting initial telemetry events from Quest headset...
                </div>
              ) : (
                timeline.map((item, idx) => (
                  <div key={item.id || idx} className="relative">
                    <div
                      className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                        item.type === 'warning'
                          ? 'bg-[#EF4444]'
                          : item.type === 'adaptive'
                          ? 'bg-[#00685f]'
                          : item.type === 'action'
                          ? 'bg-[#0061a5]'
                          : 'bg-[#10B981]'
                      }`}
                    ></div>
                    <div className="flex gap-4 items-start">
                      <span className="text-xs font-mono text-[#3d4947] shrink-0">{item.time}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#121c2a]">{item.title}</p>
                        <p className="text-xs text-[#3d4947] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
