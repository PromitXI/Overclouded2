import React, { useEffect, useState } from 'react';
import { Loader2, Cloud } from 'lucide-react';

const steps = [
  "Connecting to Azure Cloud...",
  "Retrieving Security Telemetry...",
  "Analyzing Cost Efficiency...",
  "Generating AI Insights...",
  "Finalizing Dashboard..."
];

const ScanningScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-8 text-slate-700 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full text-center relative z-10 bg-white/50 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-xl border border-white/60">
         <div className="mb-8 flex justify-center">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-400 blur-xl opacity-20 animate-pulse"></div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-50 relative">
                     <Cloud className="w-10 h-10 text-blue-500" />
                </div>
            </div>
         </div>
         
         <h2 className="text-2xl font-semibold tracking-tight mb-2 text-slate-800">Over Clouded</h2>
         <p className="text-sm text-slate-400 mb-8 font-medium uppercase tracking-widest">System Analysis</p>
         
         <div className="h-1.5 w-full bg-blue-50 rounded-full overflow-hidden mb-6">
             <div 
               className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-500 ease-out rounded-full"
               style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
             ></div>
         </div>

         <p className="text-slate-500 text-sm font-medium animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            {steps[currentStep]}
         </p>
      </div>
    </div>
  );
};

export default ScanningScreen;