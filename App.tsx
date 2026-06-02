import React, { useEffect, useState } from 'react';
import { BackgroundSlider } from './components/BackgroundSlider';
import { TournamentsView } from './components/TournamentsView';
import { initFirebase } from './services/firebaseService';

// --- Global Footer Component ---
const GlobalFooter = () => (
  <footer className="w-full py-6 text-center relative z-50 shrink-0 mt-auto bg-black/30 backdrop-blur-md border-t border-white/10">
    <div className="container mx-auto px-4 flex flex-col items-center gap-1">
      <p className="text-[10px] md:text-xs font-bold text-white drop-shadow-md">
        Desenvolvido por: André Victor Brito de Andrade
      </p>
      <p className="text-[10px] md:text-xs font-medium text-slate-300">
        Contato: andrevictorbritodeandrade@gmail.com
      </p>
      <p className="text-[10px] md:text-xs font-medium text-slate-400">
        versão: 1.0
      </p>
    </div>
  </footer>
);

// --- Sync Status Indicator ---
const SyncStatusIndicator = ({ status }: { status: 'synced' | 'saving' | 'error' }) => {
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 bg-blue-600/20 px-2.5 py-1 rounded-full border border-blue-500/30">
        <svg className="animate-spin h-3 w-3 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Salvando...</span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 bg-red-600/20 px-2.5 py-1 rounded-full border border-red-500/30">
        <svg className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[10px] font-bold text-red-200 uppercase tracking-wider">Erro ao Salvar</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 bg-green-600/20 px-2.5 py-1 rounded-full border border-green-500/30 transition-all duration-500">
      <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-[10px] font-bold text-green-200 uppercase tracking-wider">Sincronizado</span>
    </div>
  );
};

const App: React.FC = () => {
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    const success = initFirebase();
    if (success) {
      setFirebaseReady(true);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative font-sans">
      {/* Global Background */}
      <BackgroundSlider />
      
      {/* Wrapper for Content + Footer */}
      <div className="flex-1 flex flex-col z-10">
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-xl border-b border-white/20 h-14 md:h-16 flex items-center px-6 sticky top-0 z-30 shadow-lg shrink-0 transition-all duration-300 text-white justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl filter drop-shadow-md">🏆</span>
            <span className="text-xl md:text-2xl font-black uppercase tracking-wider animate-gradient-text leading-tight drop-shadow-sm">
              TORNEIOS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <SyncStatusIndicator status={firebaseReady ? 'synced' : 'saving'} />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-3 md:p-6 flex flex-col justify-center">
          <div className="max-w-7xl mx-auto w-full pb-6 flex-1 flex flex-col justify-center">
            {firebaseReady ? (
              <TournamentsView />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
                <p className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
                  Conectando ao Firestore...
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Global Footer (Always visible) */}
      <GlobalFooter />
    </div>
  );
};

export default App;
