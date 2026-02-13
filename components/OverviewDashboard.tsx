import React from 'react';
import { DashboardData } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, Shield, DollarSign, ShieldCheck, Activity, Users, Server, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

const OverviewDashboard: React.FC<{ data: DashboardData }> = ({ data }) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const securityScore = data.security.score;
  const costMTD = data.cost.currentMonthCost;
  const governanceScore = data.governance.healthScore;
  const uptime = data.monitoring.uptime;
  const totalResources = data.executive?.totalResources || 0;
  const subscriptionName = data.executive?.subscriptionName || data.subscriptionId;

  const scoreColor = (score: number) => score >= 80 ? 'text-green-500' : score >= 60 ? 'text-orange-500' : 'text-red-500';

  const resourceTypeData = (data.governance.resourcesByType || []).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Executive Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Executive Overview</h2>
            <p className="text-slate-400 text-sm mt-1">{subscriptionName}</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${data.isRealData ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {data.isRealData ? '● LIVE DATA' : '● DEMO DATA'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
          <div>
            <div className={`text-2xl font-bold ${scoreColor(securityScore)}`}>{securityScore}%</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Security</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">${(costMTD / 1000).toFixed(1)}K</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Cost MTD</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${scoreColor(governanceScore)}`}>{governanceScore}%</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Governance</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{uptime}%</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Uptime</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{totalResources}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Resources</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-400">{data.recommendations.items.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Advisories</div>
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <ExpandableSection title="Health Scores" icon={<LayoutDashboard className="w-5 h-5" />} defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Security Score', value: securityScore, icon: <Shield className="w-6 h-6" />, color: 'blue' },
            { label: 'Governance Score', value: governanceScore, icon: <ShieldCheck className="w-6 h-6" />, color: 'green' },
            { label: 'Efficiency Score', value: data.recommendations.efficiencyScore, icon: <TrendingUp className="w-6 h-6" />, color: 'purple' },
            { label: 'Uptime', value: uptime, icon: <Activity className="w-6 h-6" />, color: 'cyan' },
          ].map((metric, idx) => (
            <div key={idx} className="bg-slate-50 p-5 rounded-xl text-center">
              <div className={`mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center bg-${metric.color}-100 text-${metric.color}-600`}>
                {metric.icon}
              </div>
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-200" />
                  <circle cx="36" cy="36" r="30" stroke="currentColor" strokeWidth="5" fill="transparent"
                    className={scoreColor(metric.value)}
                    strokeDasharray={188} strokeDashoffset={188 - (188 * metric.value) / 100} strokeLinecap="round" />
                </svg>
                <span className="absolute text-sm font-bold text-slate-900">{metric.value}%</span>
              </div>
              <div className="text-sm font-bold text-slate-700 mt-2">{metric.label}</div>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* Resource Summary */}
      <ExpandableSection title="Resource Summary" icon={<Server className="w-5 h-5" />} badge={`${totalResources} total`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={resourceTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="count" nameKey="type">
                  {resourceTypeData.map((_, idx) => (<Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {resourceTypeData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-sm text-slate-700">{item.type}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </ExpandableSection>

      {/* Cost Snapshot */}
      <ExpandableSection title="Cost Snapshot" icon={<DollarSign className="w-5 h-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-xl text-center">
            <div className="text-xl font-bold text-blue-600">${costMTD.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Current Month</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl text-center">
            <div className="text-xl font-bold text-purple-600">${data.cost.forecastedCost.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Forecasted</div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl text-center">
            <div className="text-xl font-bold text-green-600">${data.cost.potentialSavings.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Potential Savings</div>
          </div>
          <div className={`p-4 rounded-xl text-center ${data.cost.monthOverMonthChange >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <div className={`text-xl font-bold flex items-center justify-center gap-1 ${data.cost.monthOverMonthChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data.cost.monthOverMonthChange >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {Math.abs(data.cost.monthOverMonthChange)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Month over Month</div>
          </div>
        </div>
      </ExpandableSection>

      {/* SLA Tracking */}
      <ExpandableSection title="SLA Tracking" icon={<CheckCircle className="w-5 h-5" />} badge={`${data.executive?.slaTracking?.length || 0} services`}>
        {(!data.executive?.slaTracking || data.executive.slaTracking.length === 0) ? (
          <div className="text-center py-6 text-slate-400">No SLA tracking data available.</div>
        ) : (
          <div className="space-y-4">
            {data.executive.slaTracking.map((sla, idx) => {
              const isMet = sla.actualUptime >= sla.contractualSla;
              return (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-800 text-sm">{sla.service}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${isMet ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isMet ? 'MET' : 'BREACH'}
                      </span>
                      <span className="text-xs text-slate-500">{sla.actualUptime}% / {sla.contractualSla}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isMet ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, (sla.actualUptime / sla.contractualSla) * 100)}%` }}>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ExpandableSection>

      {/* Key Risks */}
      <ExpandableSection title="Key Risks & Alerts" icon={<AlertTriangle className="w-5 h-5" />} badge={data.security.activeThreats} badgeColor="bg-red-100 text-red-700">
        <div className="space-y-2">
          {data.security.alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className={`p-3 rounded-xl ${alert.severity === 'High' ? 'bg-red-50' : alert.severity === 'Medium' ? 'bg-orange-50' : 'bg-yellow-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{alert.description}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${alert.severity === 'High' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                  {alert.severity}
                </span>
              </div>
            </div>
          ))}
          {data.security.alerts.length === 0 && (
            <div className="text-center py-6 text-green-600 bg-green-50 rounded-xl">No active alerts!</div>
          )}
        </div>
      </ExpandableSection>
    </div>
  );
};

export default OverviewDashboard;
