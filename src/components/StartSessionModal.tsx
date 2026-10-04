import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface StartSessionModalProps {
  initialContext?: { student?: any, module?: any, headset?: any };
  onClose: () => void;
  onSessionStarted: (sessionData: any) => void;
}

interface StudentItem {
  id: string;
  name: string;
  class: string;
  progress: number;
  avatar: string;
}

interface ModuleItem {
  id: string;
  title: string;
  subject: string;
  duration: string;
  grade: string;
}

interface HeadsetListItem {
  id: string;
  code: string;
  pairing_code?: string | null;
  device_id?: string;
  battery: string;
  status: string;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({ initialContext, onClose, onSessionStarted }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState('Guided');
  const [preTest, setPreTest] = useState(true);

  const [studentsList, setStudentsList] = useState<StudentItem[]>([
    { id: 'a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6', name: 'Alex Smith', class: 'Grade 10', progress: 85, avatar: 'AS' },
    { id: 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', name: 'Emily Johnson', class: 'Grade 11', progress: 62, avatar: 'EJ' },
    { id: 'c3d4e5f6-a7b8-4c0d-8e2f-3a4b5c6d7e8f', name: 'Michael Brown', class: 'Grade 9', progress: 40, avatar: 'MB' },
    { id: '7a7f2850-f3a4-4b48-9229-ba595dc69992', name: 'Sophia Rodriguez', class: 'Grade 10', progress: 75, avatar: 'SR' },
  ]);

  const [modulesList, setModulesList] = useState<ModuleItem[]>([
    { id: '33a7e53f-4279-455b-b9d9-bf7b1b3690d1', title: 'Mechanical Gear Assembly & Inspection', subject: 'Mechanical', duration: '45 Mins', grade: 'Grade 10' },
    { id: '44b8f64f-538a-466c-aad0-cf8c2c47a1d2', title: 'Tyre Balancing & Calibration', subject: 'Automotive', duration: '30 Mins', grade: 'Grade 10' },
    { id: '55c9a75f-649b-477d-aae1-df9d3d58b2e3', title: 'Circuit Diagram Troubleshooting', subject: 'Electronics', duration: '40 Mins', grade: 'Grade 10' },
    { id: '66da186f-75ac-488e-acf2-ef0e4e69c3f4', title: 'Adaptive Solar System Lab', subject: 'Science', duration: '35 Mins', grade: 'Grade 10' },
  ]);

  const [headsetsList, setHeadsetsList] = useState<HeadsetListItem[]>([
    { id: 'Quest-01', code: '8F3A-99B', battery: '100%', status: 'Available' },
    { id: 'Vive-12', code: '4C22-11A', battery: '95%', status: 'Available' },
    { id: 'Quest-08', code: '9K11-00P', battery: '88%', status: 'Available' },
  ]);

  const [selectedStudent, setSelectedStudent] = useState('Alex Smith');
  const [selectedStudentId, setSelectedStudentId] = useState('a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6');

  const [selectedHeadset, setSelectedHeadset] = useState('Quest-01');

  const [selectedModule, setSelectedModule] = useState('Adaptive Solar System Lab');
  const [selectedModuleId, setSelectedModuleId] = useState('66da186f-75ac-488e-acf2-ef0e4e69c3f4');

  useEffect(() => {
    // 1. Fetch live headsets
    api.getDevices()
      .then((data) => {
        if (data && data.length > 0) {
          const mapped: HeadsetListItem[] = data.map((d) => ({
            id: d.device_label,
            code: d.pairing_code ? `Pair: ${d.pairing_code}` : (d.serial_number || d.device_id.slice(0, 8)),
            pairing_code: d.pairing_code,
            device_id: d.device_id,
            battery: d.battery_level != null ? `${d.battery_level}%` : 'Ready',
            status: d.is_live || d.status === 'online' ? 'Available' : (d.status === 'in_session' ? 'In Session' : 'Standby'),
          }));
          setHeadsetsList(mapped);
          
          if (initialContext?.headset) {
            setSelectedHeadset(initialContext.headset.id || mapped[0].id);
          } else {
            setSelectedHeadset(mapped[0].id);
          }
        }
      })
      .catch(() => {});

    // 2. Fetch real students from DB
    api.getStudents()
      .then((data: any) => {
        if (data && data.length > 0) {
          const mapped: StudentItem[] = data.map((st: any) => ({
            id: st.student_id,
            name: st.full_name,
            class: st.grade || 'Grade 10',
            progress: 80,
            avatar: st.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ST',
          }));
          setStudentsList(mapped);
          
          if (initialContext?.student) {
            // Find by name or ID
            const found = mapped.find(s => s.id === initialContext.student.id || s.name === initialContext.student.name || s.name === initialContext.student.full_name);
            if (found) {
              setSelectedStudent(found.name);
              setSelectedStudentId(found.id);
            } else {
              setSelectedStudent(mapped[0].name);
              setSelectedStudentId(mapped[0].id);
            }
          } else {
            setSelectedStudent(mapped[0].name);
            setSelectedStudentId(mapped[0].id);
          }
        }
      })
      .catch(() => {});

    // 3. Fetch real modules from DB
    api.getModules()
      .then((data: any) => {
        if (data && data.length > 0) {
          const mapped: ModuleItem[] = data.map((m: any) => ({
            id: m.module_id,
            title: m.module_name,
            subject: m.category || 'Science',
            duration: '45 Mins',
            grade: m.difficulty_level ? `Level: ${m.difficulty_level}` : 'Grade 10',
          }));
          setModulesList(mapped);
          
          if (initialContext?.module) {
            const found = mapped.find(m => m.id === initialContext.module.id || m.title === initialContext.module.title);
            if (found) {
              setSelectedModule(found.title);
              setSelectedModuleId(found.id);
            } else {
              // Fallback to exactly what was passed from the frontend if not in DB yet
              setSelectedModule(initialContext.module.title);
              setSelectedModuleId(initialContext.module.id);
            }
          } else {
            setSelectedModule(mapped[0].title);
            setSelectedModuleId(mapped[0].id);
          }
        }
      })
      .catch(() => {});
      
    // Set initial step based on context
    if (initialContext?.module && !initialContext?.student) {
      setCurrentStep(1); // Still need student
    } else if (initialContext?.student && !initialContext?.module) {
      setCurrentStep(3); // Skip to module
    } else if (initialContext?.headset) {
      setCurrentStep(1); // Start from beginning
    }
  }, []);

  const handleNext = async () => {
    if (currentStep < 4) {
      let nextStep = currentStep + 1;
      if (nextStep === 2 && initialContext?.headset) nextStep++;
      if (nextStep === 3 && initialContext?.module) nextStep++;
      setCurrentStep(nextStep);
    } else {
      // Find selected headset
      const chosenHeadset = headsetsList.find((h) => h.id === selectedHeadset);
      if (chosenHeadset?.pairing_code) {
        try {
          console.log(`[StartSessionModal] Pairing headset ${chosenHeadset.pairing_code} with student ${selectedStudent} (${selectedStudentId}) and module ${selectedModule} (${selectedModuleId})`);
          await api.pairDevice({
            pairing_code: chosenHeadset.pairing_code,
            student_id: selectedStudentId,
            module_id: selectedModuleId,
          });
        } catch (err) {
          console.error('[StartSessionModal] Failed to dispatch session to headset:', err);
        }
      }

      onSessionStarted({
        student: selectedStudent,
        id: selectedHeadset,
        module: selectedModule,
        status: 'Active',
      });
    }
  };

  const handleBack = () => {
    let prevStep = currentStep - 1;
    if (prevStep === 3 && initialContext?.module) prevStep--;
    if (prevStep === 2 && initialContext?.headset) prevStep--;
    if (prevStep === 1 && initialContext?.student) prevStep--;

    if (prevStep >= 1) {
      setCurrentStep(prevStep);
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
                { num: 4, label: 'Confirm' },
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

                    {idx < 3 && (
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
                    key={st.id}
                    onClick={() => {
                      setSelectedStudent(st.name);
                      setSelectedStudentId(st.id);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedStudentId === st.id
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
                    key={m.id}
                    onClick={() => {
                      setSelectedModule(m.title);
                      setSelectedModuleId(m.id);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedModuleId === m.id
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
            <span>{currentStep === 4 ? 'Confirm and Start' : 'Next Step'}</span>
            <span className="material-symbols-outlined text-[16px]">
              {currentStep === 4 ? 'play_arrow' : 'arrow_forward'}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
};
