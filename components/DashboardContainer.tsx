import React, { useState } from 'react';
import { DashboardData } from '../types';
import OverviewDashboard from './OverviewDashboard';
import SecurityDashboard from './SecurityDashboard';
import MonitoringDashboard from './MonitoringDashboard';
import RecommendationDashboard from './RecommendationDashboard';
import EventLogDashboard from './EventLogDashboard';
import IAMDashboard from './IAMDashboard';
import CostDashboard from './CostDashboard';
import GovernanceDashboard from './GovernanceDashboard';
import { LayoutGrid, Shield, Activity, Lightbulb, FileClock, Users, Settings, HelpCircle, LogOut, ChevronDown, Search, Calendar, Download, DollarSign, AlertOctagon, Loader2 } from 'lucide-react';
import { buildReport } from '../services/report';

interface DashboardContainerProps {
  data: DashboardData;
}

type TabType = 'overview' | 'cost' | 'governance' | 'security' | 'monitoring' | 'recommendations' | 'events' | 'iam';

const DashboardContainer: React.FC<DashboardContainerProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const menuGroups = [
      {
          label: 'General',
          items: [
              { id: 'overview', label: 'Executive Dashboard', icon: LayoutGrid },
          ]
      },
      {
          label: 'Financial Mgmt',
          items: [
              { id: 'cost', label: 'Cost Analysis', icon: DollarSign },
              { id: 'recommendations', label: 'Savings Advisor', icon: Lightbulb },
          ]
      },
      {
          label: 'Governance',
          items: [
              { id: 'governance', label: 'Health Check', icon: AlertOctagon },
              { id: 'security', label: 'Security Posture', icon: Shield },
              { id: 'iam', label: 'Identity (IAM)', icon: Users },
          ]
      },
      {
          label: 'Operations',
          items: [
              { id: 'monitoring', label: 'Asset Utilization', icon: Activity },
              { id: 'events', label: 'Activity Logs', icon: FileClock },
          ]
      }
  ];

  const getTitle = () => {
      for (const group of menuGroups) {
          const item = group.items.find(i => i.id === activeTab);
          if (item) return item.label;
      }
      return 'Dashboard';
  };

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdf = buildReport(data);
      pdf.save(`Overclouded_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed', error);
      alert('Failed to generate PDF report.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col flex-shrink-0 z-20">
        
        {/* Profile / Header Area */}
        <div className="p-6 border-b border-slate-50">
           <div className="flex items-center gap-3 mb-6">
                <img src="/logo.svg" alt="Overclouded" className="w-9 h-9" />
                <span className="font-bold text-lg tracking-tight">Overclouded</span>
           </div>
           
           <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                    <Users className="w-6 h-6 text-slate-400" />
               </div>
               <div className="flex-1 min-w-0">
                   <p className="text-sm font-bold text-slate-900 truncate">Admin User</p>
                   <p className="text-xs text-slate-500 truncate">{data.subscriptionId}</p>
               </div>
           </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
            {menuGroups.map((group, gIdx) => (
                <div key={gIdx}>
                    <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{group.label}</p>
                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const isActive = activeTab === item.id;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as TabType)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                        isActive 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
        
        <div className="p-4 border-t border-slate-50 bg-slate-50/50">
             <button className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-500 text-xs font-bold uppercase tracking-wider transition-colors" onClick={() => window.location.reload()}>
                <LogOut className="w-4 h-4" /> Sign Out
             </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Top Header */}
          <header className="bg-white/80 backdrop-blur-md px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 border-b border-slate-100 z-10">
             <div>
                 <h1 className="text-xl font-bold text-slate-900">{getTitle()}</h1>
             </div>

             <div className="flex items-center gap-3">
                 <div className="hidden md:flex items-center bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-sm">
                    <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="text-slate-700 font-medium">This Month</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-4" />
                 </div>
                 
                 <button 
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPdf}
                    className="flex items-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg shadow-slate-900/10 text-sm font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    {isGeneratingPdf ? 'Generating...' : 'PDF Report'}
                 </button>
             </div>
          </header>

          {/* Scrollable Content Area */}
          <div id="dashboard-content" className="flex-1 overflow-y-auto px-8 pb-8 pt-6 custom-scrollbar bg-slate-50">
             {data.dataQuality?.status === 'partial' && (
               <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                 <strong>Partial Azure data.</strong> {data.dataQuality.warnings.length} data check{data.dataQuality.warnings.length === 1 ? '' : 's'} could not be completed. This may mean a provider is disabled, your role lacks permission, or collection is not implemented. Missing values are not health confirmations.
                 <details className="mt-2 text-xs text-amber-700">
                   <summary className="cursor-pointer font-semibold">Show unavailable checks</summary>
                   <ul className="mt-2 list-disc pl-5">{data.dataQuality.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
                 </details>
               </div>
             )}
             {activeTab === 'overview' && <OverviewDashboard data={data} />}
             {activeTab === 'cost' && <CostDashboard data={data.cost} />}
             {activeTab === 'governance' && <GovernanceDashboard data={data.governance} />}
             {activeTab === 'security' && <SecurityDashboard data={data.security} />}
             {activeTab === 'monitoring' && <MonitoringDashboard data={data.monitoring} />}
             {activeTab === 'recommendations' && <RecommendationDashboard data={data.recommendations} />}
             {activeTab === 'events' && <EventLogDashboard data={data.events} devops={data.devops} />}
             {activeTab === 'iam' && <IAMDashboard data={data.iamExtended} />}
          </div>

      </main>
    </div>
  );
};

export default DashboardContainer;
