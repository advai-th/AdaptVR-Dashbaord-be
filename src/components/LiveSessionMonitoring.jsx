import React, { useState } from 'react';

export const LiveSessionMonitoring = ({ session, onBack, onEndSession }) => {
  const [message, setMessage] = useState('Great work, Alex!');
  const [sentMessages, setSentMessages] = useState([]);
  const [isPaused, setIsPaused] = useState(false);

  const studentName = session?.student || 'Alex Chen';
  const headsetId = session?.id || 'Quest-04';
  const moduleName = session?.module || 'Adaptive Solar System Lab';

  const handleSendMessage = () => {
    if (message.trim()) {
      setSentMessages([...sentMessages, { text: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setMessage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-[#00685f] hover:underline"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to Live Sessions List
        </button>
        <span className="text-xs font-semibold px-3 py-1 bg-[#10B981]/10 text-[#10B981] rounded-full border border-[#10B981]/20">
          Telemetry Stream Active
        </span>
      </div>

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
                  Connected ({headsetId})
                </p>
              </div>
              <span className="material-symbols-outlined text-[#6d7a77] text-[32px]">face</span>
            </div>

            <div className="pt-2 border-t border-[#d9e3f6]">
              <p className="text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider mb-1">Active Module</p>
              <p className="text-sm font-medium text-[#121c2a]">{moduleName}</p>
            </div>

            <div className="flex justify-between items-end mt-1">
              <div className="w-full mr-4">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-[#3d4947]">Session Progress</span>
                  <span className="text-xs font-semibold text-[#00685f]">65%</span>
                </div>
                <div className="w-full bg-[#d9e3f6] rounded-full h-2">
                  <div className="bg-[#00685f] h-2 rounded-full w-[65%]"></div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-semibold text-[#3d4947] uppercase tracking-wider mb-1">Timer</p>
                <p className="text-lg font-bold font-mono text-[#121c2a]">15:20</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
            <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1">Session Controls</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className="h-10 border border-[#bcc9c6] rounded-lg flex items-center justify-center gap-2 text-[#3d4947] hover:bg-[#eff4ff] transition-colors text-xs font-semibold"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isPaused ? 'play_arrow' : 'pause'}
                </span>
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button className="h-10 border border-[#bcc9c6] rounded-lg flex items-center justify-center gap-2 text-[#3d4947] hover:bg-[#eff4ff] transition-colors text-xs font-semibold">
                <span className="material-symbols-outlined text-[18px]">replay</span>
                Restart Task
              </button>
            </div>

            <button 
              onClick={onEndSession}
              className="h-10 w-full border border-[#EF4444] text-[#EF4444] hover:bg-[#ffdad6]/20 rounded-lg transition-colors text-xs font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
              End Session
            </button>

            <div className="pt-4 border-t border-[#d9e3f6] mt-1">
              <label className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-2 block">
                Direct Message to Student VR Display
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type message..."
                  className="flex-1 h-10 px-3 bg-[#eff4ff] border border-[#bcc9c6] rounded-lg focus:border-[#00685f] focus:outline-none text-xs text-[#121c2a]"
                />
                <button
                  onClick={handleSendMessage}
                  className="h-10 px-4 bg-[#00685f] text-white rounded-lg hover:bg-[#008378] transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
              {sentMessages.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {sentMessages.map((m, idx) => (
                    <div key={idx} className="p-2 bg-[#F9FAFB] border border-[#bcc9c6]/40 rounded text-xs flex justify-between">
                      <span className="text-[#121c2a]">"{m.text}"</span>
                      <span className="text-[10px] text-[#3d4947]">{m.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Pane: Deep Analytics & Timeline */}
        <section className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Learner State Banner */}
          <div className="bg-[#eff4ff] border border-[#89f5e7] rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#008378] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white">psychology</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#00685f]">Adaptive Learner State</h3>
              <p className="text-xs text-[#121c2a] mt-0.5">Progressing normally — Ready for increased challenge.</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Interactions</p>
                <span className="material-symbols-outlined text-[#6d7a77] text-[20px]">touch_app</span>
              </div>
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-[#121c2a]">24</span>
                  <span className="text-xs text-[#10B981] font-semibold mb-0.5">/ 3</span>
                </div>
                <p className="text-xs text-[#3d4947] mt-1">Correct / Incorrect Attempts</p>
              </div>
            </div>

            <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Assistance</p>
                <span className="material-symbols-outlined text-[#6d7a77] text-[20px]">lightbulb</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-[#121c2a]">2</span>
                <p className="text-xs text-[#3d4947] mt-1">Hints Utilized</p>
              </div>
            </div>

            <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider">Hardware Telemetry</p>
                <span className="material-symbols-outlined text-[#6d7a77] text-[20px]">pan_tool</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-[#10B981]">High</span>
                <p className="text-xs text-[#3d4947] mt-1">Hand-Tracking Quality</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-[#bcc9c6]/40 rounded-xl p-5 flex-1 flex flex-col shadow-sm">
            <h3 className="text-base font-semibold text-[#121c2a] mb-5">Session Timeline</h3>
            <div className="relative pl-4 border-l-2 border-[#d9e3f6] flex-1 flex flex-col gap-6">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#0061a5]"></div>
                <div className="flex gap-4 items-start">
                  <span className="text-xs font-mono text-[#3d4947]">10:15</span>
                  <div>
                    <p className="text-xs font-semibold text-[#121c2a]">Challenge mode triggered</p>
                    <p className="text-xs text-[#3d4947] mt-0.5">System detected high proficiency; advanced mechanics engaged.</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                <div className="flex gap-4 items-start">
                  <span className="text-xs font-mono text-[#3d4947]">10:12</span>
                  <div>
                    <p className="text-xs font-semibold text-[#121c2a]">Planet label hint shown</p>
                    <p className="text-xs text-[#3d4947] mt-0.5">Student stalled on gas giant identification for &gt;45s.</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#d9e3f6] border border-[#6d7a77]"></div>
                <div className="flex gap-4 items-start">
                  <span className="text-xs font-mono text-[#3d4947]">10:05</span>
                  <div>
                    <p className="text-xs font-semibold text-[#121c2a]">Orbit guides enabled</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#d9e3f6] border border-[#6d7a77]"></div>
                <div className="flex gap-4 items-start">
                  <span className="text-xs font-mono text-[#3d4947]">10:00</span>
                  <div>
                    <p className="text-xs font-semibold text-[#121c2a]">Session Started</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
