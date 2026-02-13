import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import ScanningScreen from './components/ScanningScreen';
import DashboardContainer from './components/DashboardContainer';
import { AppState, DashboardData } from './types';
import { generateFallbackData } from './services/geminiService';
import { fetchAzureData } from './services/azureService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (subId: string, token?: string) => {
    setAppState(AppState.SCANNING);
    setErrorMsg(null);
    
    try {
        let data: DashboardData;
        
        if (token) {
            // REAL MODE
            try {
                data = await fetchAzureData(subId, token);
            } catch (err: any) {
                console.error("Real data fetch failed", err);
                setErrorMsg("Could not connect to Azure. Please check your permissions. Your session may have expired — try signing in again.");
                setAppState(AppState.LOGIN);
                return;
            }
        } else {
            // DEMO MODE
            data = await generateFallbackData(subId);
        }

        // Ensure the scanning animation plays for at least a few seconds to feel "real"
        const minTime = 8000;
        const startTime = Date.now();
        
        // Wait for animation if data came back too fast
        setTimeout(() => {
            setDashboardData(data);
            setAppState(AppState.DASHBOARD);
        }, Math.max(1000, minTime - (Date.now() - startTime))); // min 1s delay if fetching took long

    } catch (e) {
        console.error("Application Error", e);
        setErrorMsg("An unexpected error occurred.");
        setAppState(AppState.LOGIN);
    }
  };

  return (
    <>
      {appState === AppState.LOGIN && (
          <>
            {errorMsg && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg font-bold animate-pulse">
                    {errorMsg}
                </div>
            )}
            <LoginScreen onLogin={handleLogin} />
          </>
      )}
      {appState === AppState.SCANNING && <ScanningScreen />}
      {appState === AppState.DASHBOARD && dashboardData && <DashboardContainer data={dashboardData} />}
    </>
  );
};

export default App;