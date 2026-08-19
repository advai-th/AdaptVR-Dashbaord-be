import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onStartSession?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'students', label: 'Students', icon: 'group' },
    { id: 'modules', label: 'Modules', icon: 'view_in_ar' },
    { id: 'headsets', label: 'Headsets', icon: 'headset' },
    { id: 'live', label: 'Live Sessions', icon: 'sensors' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'reports', label: 'Reports', icon: 'description' },
  ];

  return (
    <nav className="hidden md:flex flex-col h-full py-2 gap-2 bg-[#F9FAFB] dark:bg-[#27313f] fixed left-0 top-0 w-[280px] border-r border-[#bcc9c6] dark:border-slate-700 z-30 select-none">
      {/* Header / Brand */}
      <div className="px-4 py-3 border-b border-[#bcc9c6] dark:border-slate-700 mb-2 h-16 flex items-center">
        <div className=" px-3 py-1.5 rounded-xl  flex items-center justify-center w-full h-[44px]">
          <img
            src="/assets/logo-full.svg"
            alt="AdaptVR Trainer Platform"
            className="h-7 w-auto object-contain max-w-[210px]"
          />
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                isActive
                  ? 'bg-[#008378] text-white border-l-4 border-[#00685f] dark:border-[#6bd8cb] shadow-sm'
                  : 'text-[#3d4947] dark:text-slate-200 hover:bg-[#dee9fc] dark:hover:bg-slate-700/60'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="px-3 mt-auto mb-4">
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'settings'
              ? 'bg-[#008378] text-white'
              : 'text-[#3d4947] dark:text-slate-200 hover:bg-[#dee9fc] dark:hover:bg-slate-700/60'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
};
