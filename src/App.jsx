import React, { useState } from "react";
import { Toaster } from 'react-hot-toast';
import Dashboard from "./presentation/pages/Dashboard";
import PlayerPage from "./presentation/pages/PlayerPage";
import Favorites from "./presentation/pages/Favorites";
import Settings from "./presentation/pages/Settings";
import Sidebar from "./presentation/components/Sidebar";

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'player', 'favorites', 'settings'
  const [selectedChannel, setSelectedChannel] = useState(null);

  const navigateToPlayer = (channel) => {
    setSelectedChannel(channel);
    setCurrentPage('player');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display overflow-hidden h-screen flex relative">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1e1e2d',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#fff',
            },
          },
        }}
      />
      {/* Sidebar Navigation */}
      {currentPage !== 'player' && (
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      )}

      {/* Main Content Area */}
      {currentPage === 'dashboard' && <Dashboard onPlayChannel={navigateToPlayer} />}
      {currentPage === 'favorites' && <Favorites onPlayChannel={navigateToPlayer} />}
      {currentPage === 'settings' && <Settings />}
      
      {/* Dynamic Player takes the whole layout */}
      {currentPage === 'player' && selectedChannel && (
         <PlayerPage 
            channel={selectedChannel} 
            onBack={() => setCurrentPage('dashboard')} 
            onPlayChannel={navigateToPlayer}
         />
      )}
    </div>
  );
}

export default App;
