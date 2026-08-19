import { useState, useEffect } from 'react';
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
import { DashboardOverview } from './components/DashboardOverview';
import { api } from './services/api';
import { User, Student } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard'); // 'dashboard', 'students', 'modules', 'headsets', 'live', 'student-detail', 'monitoring'
  const [isStartSessionOpen, setIsStartSessionOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // Verify JWT Token on initial app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adaptvr_auth_token');
      if (!token) {
        setIsLoggedIn(false);
        setIsAuthChecking(false);
        return;
      }

      try {
        const user = await api.getMe();
        setCurrentUser(user);
        setIsLoggedIn(true);
      } catch (err) {
        console.warn('Auth session expired or invalid:', err);
        localStorage.removeItem('adaptvr_auth_token');
        localStorage.removeItem('adaptvr_user');
        setIsLoggedIn(false);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adaptvr_auth_token');
    localStorage.removeItem('adaptvr_user');
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-3 border-[#00685f] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-[#3d4947] mt-3">Connecting to AdaptVR Engine...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLoginSuccess} />;
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

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setActiveTab('student-detail');
  };

  const handleViewMonitoring = (session: any) => {
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
          currentUser={currentUser}
          onLogout={handleLogout}
          onStartSession={() => setIsStartSessionOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8f9ff]">
          <div className="max-w-[1280px] mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardOverview
                onStartNewSession={() => setIsStartSessionOpen(true)}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

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
                onStartModule={() => {
                  setIsStartSessionOpen(true);
                }}
              />
            )}

            {activeTab === 'headsets' && (
              <HeadsetInventory
                onAssignDevice={() => {
                  setIsStartSessionOpen(true);
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
