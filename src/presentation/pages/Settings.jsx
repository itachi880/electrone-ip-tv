import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [scanState, setScanState] = useState({
    isScanning: false,
    current: 0,
    total: 0,
    channelName: '',
    error: false
  });
  const [debugLogs, setDebugLogs] = useState([]);
  
  // Settings State
  const [dvrBuffer, setDvrBuffer] = useState(
    localStorage.getItem('dvrBufferLength') || '15'
  );

  useEffect(() => {
    // Check initial state in case a scan is already running in the background
    const checkInitialState = async () => {
      if (window.api && window.api.getScanState) {
        const state = await window.api.getScanState();
        if (state.isScanning) {
          setScanState(prev => ({
            ...prev,
            isScanning: true,
            current: state.current,
            total: state.total,
            channelName: state.channelName
          }));
          if (state.debugLogs && state.debugLogs.length > 0) {
            setDebugLogs(state.debugLogs);
          }
        }
      }
    };
    
    checkInitialState();

    // Listen for scan progress events
    window.api.onScanProgress((data) => {
      if (data.error) {
        setScanState(prev => ({ ...prev, isScanning: false, error: true }));
        alert("An error occurred during the scan.");
        return;
      }

      if (data.debugLogs && data.debugLogs.length > 0) {
        setDebugLogs(prev => [...prev, ...data.debugLogs]);
      }

      setScanState(prev => {
        // If we were already complete, don't revert to scanning
        if (!prev.isScanning && data.current < data.total && !data.isComplete) {
            return prev;
        }

        return {
          isScanning: !data.isComplete,
          current: data.current,
          total: data.total,
          channelName: data.channelName || prev.channelName,
          error: false
        };
      });

      if (data.isComplete) {
         setTimeout(() => {
           alert("Scan completed successfully!");
           setScanState(prev => ({ 
             ...prev, 
             isScanning: false, 
             channelName: '',
             current: data.total // Match total
           }));
         }, 500);
      }
    });

    return () => {
      if (window.api && window.api.removeScanProgressListener) {
        window.api.removeScanProgressListener();
      }
    };
  }, []);

  const handleStartScan = async () => {
    if (scanState.isScanning) return;
    setDebugLogs([]);
    setScanState(prev => ({ ...prev, isScanning: true, current: 0, total: 0, channelName: 'Initializing...', error: false }));
    const limit = scanState.concurrencyLimit || 50;
    await window.api.triggerChannelScan(limit);
  };

  const scanPercent = scanState.total > 0 ? Math.round((scanState.current / scanState.total) * 100) : 0;


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

            {/* DVR Buffer Selection */}
            <div className="bg-white dark:bg-[#1e1e24] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold mb-1">DVR Buffer Length</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Amount of live stream to buffer in memory for rewinding.</p>
                </div>
              </div>
              <div className="relative">
                <select 
                  value={dvrBuffer}
                  onChange={(e) => setDvrBuffer(e.target.value)}
                  className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151520] text-slate-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm py-3 px-4 appearance-none cursor-pointer"
                >
                  <option value="15">15 Seconds (Low Memory)</option>
                  <option value="30">30 Seconds</option>
                  <option value="60">60 Seconds (1 Minute)</option>
                  <option value="120">120 Seconds (2 Minutes)</option>
                  <option value="300">300 Seconds (5 Minutes)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </div>
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

              {!scanState.isScanning && (
                <div className="mb-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Concurrency Limit</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="1000" 
                    value={scanState.concurrencyLimit || 50} 
                    onChange={(e) => setScanState(prev => ({ ...prev, concurrencyLimit: parseInt(e.target.value) || 50 }))}
                    className="w-20 px-2 py-1 text-sm bg-white dark:bg-[#151520] border border-slate-200 dark:border-slate-700 rounded text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
              
              {scanState.isScanning && (
                <div className="mb-4 w-full">
                  <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    <span className="truncate max-w-[70%] text-primary">{scanState.channelName || 'Scanning...'}</span>
                    <span>{scanState.current} / {scanState.total} ({scanPercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${scanPercent}%` }}></div>
                  </div>
                </div>
              )}

              {debugLogs.length > 0 && (
                <div className="mb-4 w-full bg-slate-900 rounded-lg p-3 overflow-y-auto" style={{ maxHeight: '150px' }}>
                  <div className="text-xs font-bold text-slate-400 mb-2">Scanner Debug Logs:</div>
                  {debugLogs.slice(-15).map((log, idx) => (
                    <div key={idx} className="text-[10px] text-green-400 font-mono break-all mb-1">{log}</div>
                  ))}
                </div>
              )}

              <button 
                onClick={handleStartScan}

                disabled={scanState.isScanning}
                className={`w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  scanState.isScanning 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-transparent'
                    : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                }`}
              >
                {scanState.isScanning ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                    Scanning Network...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">radar</span>
                    Start Background Scan
                  </>
                )}
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
          <button 
            onClick={() => {
              localStorage.setItem('dvrBufferLength', dvrBuffer);
              alert('Settings saved successfully!');
            }}
            className="px-8 py-3 rounded-lg text-sm font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            Save Changes
          </button>
        </div>
      </div>
    </main>
  );
};

export default Settings;
