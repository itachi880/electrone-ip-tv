import React from 'react';

const Settings = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative bg-background-light dark:bg-background-dark">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] mb-2 text-slate-900 dark:text-white">Advanced Playback</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Configure decoder preferences and stream performance metrics.</p>
        </div>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6 text-primary font-bold uppercase tracking-wider text-xs">
            <span className="material-symbols-outlined text-lg">memory</span>
            Playback Engine
          </div>
          <div className="grid gap-6">
            {/* Decoder Selection */}
            <div className="bg-white dark:bg-[#1e1e24] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold mb-1">Video Decoder</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Hardware Acceleration (HW) vs Software (SW).</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="cursor-pointer group relative">
                    <input className="peer sr-only" name="decoder" type="radio" defaultChecked />
                    <div className="p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 peer-checked:border-primary peer-checked:bg-primary/5 transition-all flex items-center gap-4">
                        <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center peer-checked:bg-primary peer-checked:text-white transition-colors">
                            <span className="material-symbols-outlined">developer_board</span>
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 dark:text-white">Hardware Decoder</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">GPU acceleration (Efficient)</div>
                        </div>
                    </div>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <div className="flex items-center gap-2 mb-6 text-primary font-bold uppercase tracking-wider text-xs">
            <span className="material-symbols-outlined text-lg">tune</span>
            Data & Interface
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#1e1e24] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined">palette</span>
                  </div>
                  <h3 className="text-lg font-bold">Theme Selection</h3>
                </div>
              </div>
              <div className="relative">
                <select className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151520] text-slate-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm py-3 px-4 appearance-none cursor-pointer">
                  <option>Midnight Dark</option>
                  <option>System Default</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <div className="flex items-center gap-2 mb-6 text-primary font-bold uppercase tracking-wider text-xs">
            <span className="material-symbols-outlined text-lg">public</span>
            Channel Management
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#1e1e24] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <span className="material-symbols-outlined">network_check</span>
                  </div>
                  <h3 className="text-lg font-bold">Network Scanner</h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Scan all channels to verify stream liveliness and flag dead links.</p>
              </div>
              <button 
                onClick={async () => {
                  alert("Scan started in the background. Check channel statuses on the dashboard.");
                  await window.api.triggerChannelScan();
                }}
                className="w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">radar</span>
                Start Background Scan
              </button>
            </div>

            <div className="bg-white dark:bg-[#1e1e24] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined">delete_sweep</span>
                  </div>
                  <h3 className="text-lg font-bold">Clean Library</h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Remove all channels flagged as offline ("NO" state) from the database.</p>
              </div>
              <button 
                onClick={async () => {
                  if (confirm("Are you sure you want to delete all dead channels?")) {
                    await window.api.deleteDeadChannels();
                    alert("Dead channels removed.");
                  }
                }}
                className="w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">delete_forever</span>
               Remove Dead Channels
              </button>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-4 mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
          <button className="px-8 py-3 rounded-lg text-sm font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">save</span>
            Save Changes
          </button>
        </div>
      </div>
    </main>
  );
};

export default Settings;
