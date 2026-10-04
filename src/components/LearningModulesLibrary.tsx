import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface LearningModulesLibraryProps {
  onStartModule: (module: any) => void;
}

export const LearningModulesLibrary: React.FC<LearningModulesLibraryProps> = ({ onStartModule }) => {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Add Module Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newCategory, setNewCategory] = useState('Science');
  const [newDescription, setNewDescription] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('Adaptive');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Fallback seed modules in case DB is fresh
  const seedModules = [
    {
      module_id: '66da186f-75ac-488e-acf2-ef0e4e69c3f4',
      module_name: 'Adaptive Solar System Lab',
      category: 'Science',
      difficulty_level: 'Adaptive',
      description:
        'An immersive journey through the solar system featuring dynamic gravity simulations and on-device AI-guided spatial orbit puzzles.',
      status: 'active',
      session_count: 24,
      avg_score: 88,
    },
    {
      module_id: '33a7e53f-4279-455b-b9d9-bf7b1b3690d1',
      module_name: 'Mechanical Gear Assembly & Inspection',
      category: 'Engineering',
      difficulty_level: 'Intermediate',
      description: 'Hands-on VR disassembly, planetary gear calibration, and torque verification exercises.',
      status: 'active',
      session_count: 14,
      avg_score: 79,
    },
    {
      module_id: '44b8f64f-538a-466c-aad0-cf8c2c47a1d2',
      module_name: 'Tyre Balancing & Wheel Calibration',
      category: 'Automotive',
      difficulty_level: 'Beginner',
      description: 'Step-by-step automotive workshop training on high-speed dynamic wheel balancing and counterweights.',
      status: 'active',
      session_count: 9,
      avg_score: 82,
    },
    {
      module_id: '55c9a75f-649b-477d-aae1-df9d3d58b2e3',
      module_name: 'Circuit Diagram Troubleshooting',
      category: 'Electronics',
      difficulty_level: 'Advanced',
      description: 'Locate short circuits, burnt resistors, and open paths in realistic virtual breadboards and multimeters.',
      status: 'active',
      session_count: 18,
      avg_score: 74,
    },
  ];

  const loadModules = async () => {
    try {
      setLoading(true);
      const data = await api.getModules();
      if (Array.isArray(data) && data.length > 0) {
        setModules(data);
      } else {
        setModules(seedModules);
      }
    } catch (err) {
      console.warn('[LearningModulesLibrary] Could not load from DB, using seed data:', err);
      setModules(seedModules);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) {
      setFormError('Please enter a module title.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      const created = await api.createModule({
        module_name: newModuleName.trim(),
        category: newCategory,
        description: newDescription.trim() || 'Custom VR educational curriculum module.',
        difficulty_level: newDifficulty,
        status: 'active',
      });

      setModules((prev) => [created, ...prev]);
      setSuccessToast(`Module "${newModuleName}" added to catalog!`);
      setTimeout(() => setSuccessToast(''), 4000);

      setNewModuleName('');
      setNewDescription('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save module to catalog.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (mod: any) => {
    const nextStatus = mod.status === 'active' ? 'inactive' : 'active';
    try {
      await api.updateModule(mod.module_id, { status: nextStatus });
      setModules((prev) =>
        prev.map((m) => (m.module_id === mod.module_id ? { ...m, status: nextStatus } : m))
      );
    } catch (err) {
      console.error('Failed toggling module status:', err);
    }
  };

  const filtered = modules.filter((m) => {
    const subjectMatch = subjectFilter === 'All' || m.category?.toLowerCase() === subjectFilter.toLowerCase();
    const diffMatch =
      difficultyFilter === 'All' ||
      m.difficulty_level?.toLowerCase() === difficultyFilter.toLowerCase();
    const searchMatch =
      !searchTerm ||
      m.module_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return subjectMatch && diffMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="bg-[#10B981]/10 border border-[#10B981]/30 text-[#00685f] px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {successToast}
        </div>
      )}

      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2a]">Learning Modules Library</h1>
          <p className="text-sm text-[#3d4947] mt-1">
            Browse, manage, and dispatch VR educational content with AI adaptation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 px-4 bg-[#00685f] hover:bg-[#008378] text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Module
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-[#bcc9c6]/40 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <span className="material-symbols-outlined text-[#3d4947] text-[20px] ml-1">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search modules..."
            className="w-full text-xs text-[#121c2a] bg-transparent outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-9 px-3 bg-[#eff4ff] border border-[#bcc9c6] rounded-lg text-xs font-semibold text-[#121c2a] focus:border-[#00685f] outline-none"
          >
            <option value="All">Category: All</option>
            <option value="Science">Science</option>
            <option value="Engineering">Engineering</option>
            <option value="Automotive">Automotive</option>
            <option value="Electronics">Electronics</option>
            <option value="Biology">Biology</option>
            <option value="Physics">Physics</option>
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="h-9 px-3 bg-[#eff4ff] border border-[#bcc9c6] rounded-lg text-xs font-semibold text-[#121c2a] focus:border-[#00685f] outline-none"
          >
            <option value="All">Difficulty: All</option>
            <option value="Adaptive">Adaptive</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && modules.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#3d4947]">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading module catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#3d4947]">
            <span className="material-symbols-outlined text-[36px] text-[#bcc9c6] block mb-2">view_in_ar</span>
            No learning modules found matching your filter criteria.
          </div>
        ) : (
          filtered.map((m) => {
            const isAdaptive =
              m.difficulty_level?.toLowerCase() === 'adaptive' ||
              m.module_name?.toLowerCase().includes('solar');
            const isActive = m.status !== 'inactive';

            return (
              <div
                key={m.module_id}
                className={`bg-white rounded-xl border p-5 flex flex-col justify-between shadow-sm transition-all hover:shadow-md ${
                  isAdaptive ? 'border-[#008378] ring-1 ring-[#008378]/20' : 'border-[#bcc9c6]/40'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#008378]/10 text-[#008378]">
                      {m.category || 'General'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isActive ? 'Active' : 'Archived'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#121c2a] mb-1.5 flex items-center gap-1.5">
                    {m.module_name}
                    {isAdaptive && (
                      <span
                        className="material-symbols-outlined text-[#008378] text-[18px]"
                        title="AI Adaptive Cognitive Load Enabled"
                      >
                        auto_awesome
                      </span>
                    )}
                  </h3>

                  <p className="text-xs text-[#3d4947] line-clamp-3 mb-4 leading-relaxed">
                    {m.description || 'Interactive virtual reality learning experience.'}
                  </p>
                </div>

                <div>
                  {/* Meta Chips */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-[#bcc9c6]/30 mb-4 text-[11px] text-[#3d4947]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">tune</span>
                      {m.difficulty_level || 'Adaptive'}
                    </span>
                    <span className="text-[#bcc9c6]">•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">history</span>
                      {m.session_count || 0} sessions
                    </span>
                    {m.avg_score != null && (
                      <>
                        <span className="text-[#bcc9c6]">•</span>
                        <span className="flex items-center gap-1 text-[#008378] font-bold">
                          <span className="material-symbols-outlined text-[14px]">grade</span>
                          {Math.round(parseFloat(m.avg_score))}% avg
                        </span>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onStartModule({
                          id: m.module_id,
                          title: m.module_name,
                          subject: m.category,
                        })
                      }
                      className="flex-1 h-9 bg-[#00685f] hover:bg-[#008378] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      Launch Session
                    </button>
                    <button
                      onClick={() => handleToggleStatus(m)}
                      title={isActive ? 'Deactivate module' : 'Activate module'}
                      className="h-9 px-2.5 border border-[#bcc9c6] hover:bg-[#eff4ff] text-[#3d4947] rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isActive ? 'pause_circle' : 'check_circle'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Module Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#bcc9c6]/40 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#121c2a] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00685f]">library_add</span>
                Add Learning Module
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#3d4947] hover:text-[#121c2a] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-[#ffdad6]/40 border border-[#ffdad6] text-[#ba1a1a] p-3 rounded-lg text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateModule} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#121c2a] block mb-1">Module Name / Title *</label>
                <input
                  type="text"
                  required
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="e.g. Aerodynamic Drag Simulation"
                  className="w-full h-10 px-3 border border-[#bcc9c6] rounded-lg focus:border-[#00685f] outline-none text-[#121c2a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#121c2a] block mb-1">Category / Discipline</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-10 px-3 border border-[#bcc9c6] rounded-lg focus:border-[#00685f] outline-none text-[#121c2a]"
                  >
                    <option value="Science">Science</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Automotive">Automotive</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Biology">Biology</option>
                    <option value="Physics">Physics</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#121c2a] block mb-1">Difficulty Mode</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value)}
                    className="w-full h-10 px-3 border border-[#bcc9c6] rounded-lg focus:border-[#00685f] outline-none text-[#121c2a]"
                  >
                    <option value="Adaptive">Adaptive (AI Dynamic)</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#121c2a] block mb-1">Description &amp; Learning Objectives</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the tasks, gestures, and concepts involved in this VR session..."
                  className="w-full p-3 border border-[#bcc9c6] rounded-lg focus:border-[#00685f] outline-none text-[#121c2a]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#bcc9c6] rounded-lg font-semibold text-[#3d4947] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#00685f] hover:bg-[#008378] text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
