import React, { useState } from 'react';

interface StartSessionModalProps {
  onClose: () => void;
  onSessionStarted: (sessionData: any) => void;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({ onClose, onSessionStarted }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState('Alex Chen');
  const [selectedHeadset, setSelectedHeadset] = useState('Quest-01');
  const [selectedModule, setSelectedModule] = useState('Adaptive Solar System Lab');
  const [mode, setMode] = useState('Guided');
  const [preTest, setPreTest] = useState(true);

  const studentsList = [
    { name: 'Alex Chen', class: 'Class 10-B', progress: 85, avatar: 'AC' },
    { name: 'Sarah Jenkins', class: 'Class 10-B', progress: 62, avatar: 'SJ' },
    { name: 'Marcus Chen', class: 'Class 10-A', progress: 91, avatar: 'MC' },
    { name: 'Emma Watson', class: 'Class 10-B', progress: 40, avatar: 'EW' },
  ];

  const headsetsList = [
    { id: 'Quest-01', code: '8F3A-99B', battery: '100%', status: 'Available' },
    { id: 'Vive-12', code: '4C22-11A', battery: '95%', status: 'Available' },
    { id: 'Quest-08', code: '9K11-00P', battery: '88%', status: 'Available' },
  ];

  const modulesList = [
    { title: 'Adaptive Solar System Lab', subject: 'Science', duration: '45 Mins', grade: 'Grade 10' },
    { title: 'Cellular Mitosis V2', subject: 'Biology', duration: '30 Mins', grade: 'Grade 10' },
    { title: 'Physics: Gravity Mechanics', subject: 'Physics', duration: '40 Mins', grade: 'Grade 10' },
  ];

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      onSessionStarted({
        student: selectedStudent,
        id: selectedHeadset,
        module: selectedModule,
        status: 'Active',
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#121c2a]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#bcc9c6]/40 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <header className="bg-white border-b border-[#bcc9c6]/30 px-6 py-4 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-[#3d4947] hover:text-[#121c2a] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
              <span className="text-xs font-semibold">Cancel Session</span>
            </button>
            <h1 className="text-lg font-bold text-[#121c2a]">Start New Session</h1>
            <div className="w-16"></div>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center max-w-2xl mx-auto w-full pt-1 pb-3">
            <div className="flex items-center w-full">
              {[
                { num: 1, label: 'Student' },
                { num: 2, label: 'Headset' },
                { num: 3, label: 'Module' },
                { num: 4, label: 'Configure' },
                { num: 5, label: 'Confirm' },
              ].map((step, idx) => {
                const isPassed = currentStep > step.num;
                const isCurrent = currentStep === step.num;

                return (
                  <React.Fragment key={step.num}>
                    <div className="flex flex-col items-center relative z-10">
                      <div
                        onClick={() => step.num < currentStep && setCurrentStep(step.num)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer transition-all ${
                          isPassed
                            ? 'bg-[#008378] text-white'
                            : isCurrent
                            ? 'bg-[#00685f] text-white ring-4 ring-[#008378]/20'
                            : 'bg-[#eff4ff] text-[#3d4947] border border-[#bcc9c6]'
                        }`}
                      >
                        {isPassed ? (
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        ) : (
                          step.num
                        )}
                      </div>
                      <span className={`text-[11px] absolute -bottom-5 whitespace-nowrap ${isCurrent ? 'font-bold text-[#00685f]' : 'text-[#3d4947]'}`}>
                        {step.label}
                      </span>
                    </div>

                    {idx < 4 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          currentStep > step.num ? 'bg-[#008378]' : 'bg-[#bcc9c6]/40'
                        }`}
                      ></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F9FAFB]">
          {currentStep === 1 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h2 className="text-xl font-bold text-[#121c2a] text-center">Select Student</h2>
              <p className="text-xs text-[#3d4947] text-center">Choose student for this VR session</p>
              <div className="grid grid-cols-1 gap-3 mt-4">
                {studentsList.map((st) => (
                  <div
                    key={st.name}
                    onClick={() => setSelectedStudent(st.name)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedStudent === st.name
                        ? 'border-[#00685f] bg-[#008378]/10 shadow-sm'
                        : 'border-[#bcc9c6]/40 bg-white hover:bg-[#eff4ff]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#008378] text-white flex items-center justify-center font-bold text-sm">
                        {st.avatar}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#121c2a]">{st.name}</h4>
                        <p className="text-xs text-[#3d4947]">{st.class}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#00685f]">{st.progress}% Complete</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h2 className="text-xl font-bold text-[#121c2a] text-center">Select Headset</h2>
              <p className="text-xs text-[#3d4947] text-center">Assign an available headset from inventory</p>
              <div className="grid grid-cols-1 gap-3 mt-4">
                {headsetsList.map((hs) => (
                  <div
                    key={hs.id}
                    onClick={() => setSelectedHeadset(hs.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedHeadset === hs.id
                        ? 'border-[#00685f] bg-[#008378]/10 shadow-sm'
                        : 'border-[#bcc9c6]/40 bg-white hover:bg-[#eff4ff]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#00685f] text-[28px]">headset</span>
                      <div>
                        <h4 className="text-sm font-semibold text-[#121c2a]">{hs.id}</h4>
                        <p className="text-xs text-[#3d4947]">ID: {hs.code}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#10B981]">{hs.status} • {hs.battery}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h2 className="text-xl font-bold text-[#121c2a] text-center">Select Learning Module</h2>
              <p className="text-xs text-[#3d4947] text-center">Choose the curriculum module to dispatch</p>
              <div className="grid grid-cols-1 gap-3 mt-4">
                {modulesList.map((m) => (
                  <div
                    key={m.title}
                    onClick={() => setSelectedModule(m.title)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedModule === m.title
                        ? 'border-[#00685f] bg-[#008378]/10 shadow-sm'
                        : 'border-[#bcc9c6]/40 bg-white hover:bg-[#eff4ff]'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-semibold text-[#00685f] uppercase tracking-wider">{m.subject}</span>
                      <h4 className="text-sm font-semibold text-[#121c2a]">{m.title}</h4>
                      <p className="text-xs text-[#3d4947]">{m.duration} • {m.grade}</p>
                    </div>
                    <span className="material-symbols-outlined text-[#00685f]">chevron_right</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <h2 className="text-xl font-bold text-[#121c2a] text-center">Configure Session</h2>
              <p className="text-xs text-[#3d4947] text-center">Set session mode and evaluation parameters</p>
              
              <div className="bg-white p-5 rounded-xl border border-[#bcc9c6]/40 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider block mb-2">Session Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('Guided')}
                      className={`py-2 px-4 rounded-lg text-xs font-semibold border cursor-pointer ${mode === 'Guided' ? 'bg-[#008378] text-white border-[#00685f]' : 'border-[#bcc9c6] text-[#3d4947]'}`}
                    >
                      Guided Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('Free Exploration')}
                      className={`py-2 px-4 rounded-lg text-xs font-semibold border cursor-pointer ${mode === 'Free Exploration' ? 'bg-[#008378] text-white border-[#00685f]' : 'border-[#bcc9c6] text-[#3d4947]'}`}
                    >
                      Free Exploration
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#eff4ff]">
                  <div>
                    <h4 className="text-sm font-semibold text-[#121c2a]">Enable Pre-Test Assessment</h4>
                    <p className="text-xs text-[#3d4947]">Runs 3 quick diagnostic questions before module</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preTest}
                    onChange={(e) => setPreTest(e.target.checked)}
                    className="w-5 h-5 rounded border-[#bcc9c6] text-[#00685f] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#121c2a]">Review Session Details</h2>
                <p className="text-xs text-[#3d4947] mt-1">Please confirm the configuration before launching VR environment.</p>
              </div>

              {/* Bento Grid Review Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#bcc9c6]/40 shadow-sm">
                  <div className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-2">Student</div>
                  <h3 className="text-base font-bold text-[#121c2a]">{selectedStudent}</h3>
                  <p className="text-xs text-[#3d4947]">Class 10-B</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#bcc9c6]/40 shadow-sm">
                  <div className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-2">Headset</div>
                  <h3 className="text-base font-bold text-[#121c2a]">{selectedHeadset}</h3>
                  <p className="text-xs text-[#10B981] font-semibold">Ready • 100% Battery</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#bcc9c6]/40 shadow-sm">
                  <div className="text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-2">Settings</div>
                  <h3 className="text-base font-bold text-[#121c2a]">{mode}</h3>
                  <p className="text-xs text-[#3d4947]">Pre-test: {preTest ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#bcc9c6]/40 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-[#00685f] uppercase tracking-wider">Module</span>
                  <h3 className="text-lg font-bold text-[#121c2a]">{selectedModule}</h3>
                  <p className="text-xs text-[#3d4947]">Interactive exploration of planetary orbits and gravitational mechanics.</p>
                </div>
                <span className="material-symbols-outlined text-[#00685f] text-[36px]">public</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-[#bcc9c6]/30 px-6 py-4 flex justify-between items-center shrink-0">
          <button
            onClick={handleBack}
            className="px-5 py-2 rounded-lg border border-[#bcc9c6] text-[#3d4947] text-xs font-semibold hover:bg-[#eff4ff] transition-colors cursor-pointer"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2 rounded-lg bg-[#00685f] hover:bg-[#008378] text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span>{currentStep === 5 ? 'Confirm and Start' : 'Next Step'}</span>
            <span className="material-symbols-outlined text-[16px]">
              {currentStep === 5 ? 'play_arrow' : 'arrow_forward'}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
};
