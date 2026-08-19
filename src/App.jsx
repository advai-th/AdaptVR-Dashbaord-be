import React, { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { TopNavBar } from './components/TopNavBar';
import { LiveSessionsTable } from './components/LiveSessionsTable';
import { LiveSessionMonitoring } from './components/LiveSessionMonitoring';
import { StartSessionModal } from './components/StartSessionModal';
import { StudentsDirectory } from './components/StudentsDirectory';
import { StudentProfileAnalytics } from './components/StudentProfileAnalytics';
import { LearningModulesLibrary } from './components/LearningModulesLibrary';
import { HeadsetInventory } from './components/HeadsetInventory';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Default logged in for easy review
  const [activeTab, setActiveTab] = useState('live'); // 'dashboard', 'students', 'modules', 'headsets', 'live', 'student-detail', 'monitoring'
  const [isStartSessionOpen, setIsStartSessionOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  // Handle transactional workflow screen override (Start New Session Stepper Modal)
  if (isStartSessionOpen) {
    return (
      <div className="min-h-screen bg-[#f8f9ff]">
        <StartSessionModal
          onClose={() => setIsStartSessionOpen(false)}
          onSessionStarted={(sessionData) => {
            setIsStartSessionOpen(false);
            setSelectedSession(sessionData);
            setActiveTab('monitoring');
          }}
        />
      </div>
    );
  }

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setActiveTab('student-detail');
  };

  const handleViewMonitoring = (session) => {
    setSelectedSession(session || { id: 's1', studentName: 'Alex Chen', deviceId: 'Quest-02', moduleName: 'Solar System Lab' });
    setActiveTab('monitoring');
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onStartSession={() => setIsStartSessionOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:ml-[280px] min-h-screen overflow-hidden">
        {/* Top Header Bar */}
        <TopNavBar
          activeTab={activeTab}
          onLogout={() => setIsLoggedIn(false)}
          onStartSession={() => setIsStartSessionOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8f9ff]">
          <div className="max-w-[1280px] mx-auto">
            {activeTab === 'live' && (
              <LiveSessionsTable
                onViewMonitoring={handleViewMonitoring}
                onStartSession={() => setIsStartSessionOpen(true)}
              />
            )}

            {activeTab === 'monitoring' && (
              <LiveSessionMonitoring
                session={selectedSession}
                onBack={() => setActiveTab('live')}
              />
            )}

            {activeTab === 'students' && (
              <StudentsDirectory
                onSelectStudent={handleSelectStudent}
                onStartSessionForStudent={(student) => {
                  setSelectedStudent(student);
                  setIsStartSessionOpen(true);
                }}
              />
            )}

            {activeTab === 'student-detail' && (
              <StudentProfileAnalytics
                student={selectedStudent}
                onBack={() => setActiveTab('students')}
                onStartSession={() => setIsStartSessionOpen(true)}
              />
            )}

            {activeTab === 'modules' && (
              <LearningModulesLibrary
                onStartModule={(mod) => {
                  setIsStartSessionOpen(true);
                }}
              />
            )}

            {activeTab === 'headsets' && (
              <HeadsetInventory
                onAssignDevice={(device) => {
                  setIsStartSessionOpen(true);
                }}
              />
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-[#bcc9c6]/40 shadow-sm flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-[#121c2a]">Welcome back, Professor Smith</h1>
                    <p className="text-sm text-[#3d4947] mt-1">Science Department • Northwood Academy</p>
                  </div>
                  <button
                    onClick={() => setIsStartSessionOpen(true)}
                    className="px-5 py-2.5 bg-[#00685f] text-white rounded-lg text-xs font-semibold hover:bg-[#008378] transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span> Start VR Session
                  </button>
                </div>

                <LiveSessionsTable
                  onViewMonitoring={handleViewMonitoring}
                  onStartSession={() => setIsStartSessionOpen(true)}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
