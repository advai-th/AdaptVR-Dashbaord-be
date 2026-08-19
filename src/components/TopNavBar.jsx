import React from 'react';

export const TopNavBar = ({ onStartNewSession, teacherName, onLogout }) => {
  return (
    <header className="flex justify-between items-center w-full px-6 h-16 z-40 bg-white dark:bg-[#27313f] border-b border-[#bcc9c6] dark:border-slate-700 shrink-0 sticky top-0">
      {/* Left: Brand (Mobile) / Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="md:hidden mr-4 flex items-center">
          <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm flex items-center h-[36px]">
            <img src="/assets/logo-full.svg" alt="AdaptVR" className="h-6 w-auto object-contain" />
          </div>
        </div>
        <div className="relative w-full max-w-md hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] dark:text-slate-400 text-[20px]">
            search
          </span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-[#eff4ff] dark:bg-slate-800/90 border border-[#bcc9c6] dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-[#00685f] dark:focus:border-[#6bd8cb] focus:ring-1 focus:ring-[#00685f] transition-colors text-[#121c2a] dark:text-white placeholder:text-[#3d4947]/70 dark:placeholder:text-slate-400 h-[40px]"
            placeholder="Search students, modules, headsets..."
            type="text"
          />
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={onStartNewSession}
          className="h-[40px] px-4 bg-[#00685f] hover:bg-[#008378] text-white rounded-lg text-sm font-semibold transition-colors shadow-sm hidden lg:flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Start New Session</span>
        </button>

        <div className="h-6 w-px bg-[#bcc9c6] dark:bg-slate-600 mx-1 hidden lg:block"></div>

        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full hover:bg-[#eff4ff] dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-[#3d4947] dark:text-slate-200 relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white dark:border-[#27313f]"></span>
          </button>
          <button className="w-10 h-10 rounded-full hover:bg-[#eff4ff] dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-[#3d4947] dark:text-slate-200 hidden sm:flex">
            <span className="material-symbols-outlined">apps</span>
          </button>
        </div>

        <div className="flex items-center gap-3 ml-2 border-l border-[#bcc9c6] dark:border-slate-600 pl-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-[#121c2a] dark:text-white leading-tight">
              {teacherName || 'Dr. E. Vance'}
            </span>
            <span className="text-[11px] font-medium text-[#3d4947] dark:text-slate-300">Class 10-B</span>
          </div>

          <div 
            onClick={onLogout}
            title="Click to Logout"
            className="w-9 h-9 rounded-full bg-[#008378] text-white flex items-center justify-center font-bold text-sm cursor-pointer border border-[#bcc9c6] dark:border-slate-600 shadow-sm"
          >
            {teacherName ? teacherName.charAt(0).toUpperCase() : 'V'}
          </div>
        </div>
      </div>
    </header>
  );
};
