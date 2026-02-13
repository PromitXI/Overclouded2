import React from 'react';
import { GovernanceData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShieldCheck, AlertOctagon, Tags, Ghost, Check, X, AlertTriangle, Layers, MapPin, Gauge, FileText } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

const GovernanceDashboard: React.FC<{ data: GovernanceData }> = ({ data }) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

  return (
    <div className="space-y-6">
       {/* Health Score Hero */}
       <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between shadow-xl">
           <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-700" />
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-green-400" strokeDasharray={251} strokeDashoffset={251 - (251 * data.healthScore) / 100} strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-xl font-bold">{data.healthScore}</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Governance Health</h2>
                    <p className="text-slate-400 text-sm">Overclouded Policy Evaluation</p>
                </div>
           </div>
           <div className="flex gap-6 mt-4 md:mt-0 text-center flex-wrap justify-center">
               <div>
                   <div className="text-2xl font-bold text-red-400">{data.policyViolations}</div>
                   <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Violations</div>
               </div>
               <div>
                   <div className="text-2xl font-bold text-orange-400">{data.zombieAssets}</div>
                   <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Zombies</div>
               </div>
               <div>
                   <div className="text-2xl font-bold text-blue-400">{data.taggingCompliance}%</div>
                   <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Tagged</div>
               </div>
               <div>
                   <div className="text-2xl font-bold text-purple-400">{data.namingCompliancePercent || 0}%</div>
                   <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Naming</div>
               </div>
           </div>
       </div>

       {/* Policy Violations */}
       <ExpandableSection title="Policy Violations" icon={<AlertOctagon className="w-5 h-5" />} badge={data.policyViolations} badgeColor="bg-red-100 text-red-700" defaultOpen={true}>
           <div className="divide-y divide-slate-50">
               {data.policies.length === 0 ? (
                   <div className="text-center py-6 text-slate-400">No policy data available.</div>
               ) : (
                   data.policies.map((policy) => (
                       <div key={policy.id} className="py-4 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                               <div className={`p-1.5 rounded-lg ${policy.status === 'Passed' ? 'bg-green-100 text-green-600' : policy.status === 'Failed' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                   {policy.status === 'Passed' ? <Check className="w-4 h-4" /> : policy.status === 'Failed' ? <X className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                               </div>
                               <div>
                                   <h4 className="font-bold text-slate-900 text-sm">{policy.name}</h4>
                                   <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${policy.severity === 'High' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{policy.severity}</span>
                               </div>
                           </div>
                           <div className="text-right">
                               <div className="text-lg font-bold text-slate-900">{policy.affectedResources}</div>
                               <div className="text-[10px] text-slate-400">affected</div>
                           </div>
                       </div>
                   ))
               )}
           </div>
       </ExpandableSection>

       {/* Resource Inventory by Type */}
       <ExpandableSection title="Resource Inventory by Type" icon={<Layers className="w-5 h-5" />} badge={`${(data.resourcesByType || []).reduce((s, r) => s + r.count, 0)} total`}>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="h-[280px]">
                   <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                           <Pie data={(data.resourcesByType || []).slice(0, 8)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="count" nameKey="type">
                               {(data.resourcesByType || []).slice(0, 8).map((_, idx) => (<Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />))}
                           </Pie>
                           <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                       </PieChart>
                   </ResponsiveContainer>
               </div>
               <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
                   {(data.resourcesByType || []).map((item, idx) => (
                       <div key={idx} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-50">
                           <div className="flex items-center gap-2">
                               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                               <span className="text-slate-700">{item.type}</span>
                           </div>
                           <span className="font-bold text-slate-900">{item.count}</span>
                       </div>
                   ))}
               </div>
           </div>
       </ExpandableSection>

       {/* Resource Inventory by Region */}
       <ExpandableSection title="Resource Distribution by Region" icon={<MapPin className="w-5 h-5" />} badge={`${(data.resourcesByRegion || []).length} regions`}>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {(data.resourcesByRegion || []).map((region, idx) => (
                   <div key={idx} className="bg-slate-50 p-4 rounded-xl text-center">
                       <div className="text-xl font-bold text-slate-900">{region.count}</div>
                       <div className="text-sm text-slate-500 mt-1">{region.region}</div>
                   </div>
               ))}
           </div>
       </ExpandableSection>

       {/* Tagging & Naming */}
       <ExpandableSection title="Tagging & Naming Hygiene" icon={<Tags className="w-5 h-5" />}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <Tags className="w-5 h-5 text-purple-600" />
                        <h4 className="font-bold text-slate-900">Tag Compliance</h4>
                    </div>
                    <p className="text-slate-500 text-sm mb-3">Resources with mandatory tags (CostCenter, Owner, Env)</p>
                    <div className="flex justify-between text-sm mb-1 font-bold text-slate-700">
                        <span>Compliance</span><span>{data.taggingCompliance}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${data.taggingCompliance}%` }}></div>
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h4 className="font-bold text-slate-900">Naming Convention</h4>
                    </div>
                    <p className="text-slate-500 text-sm mb-3">Resources following standard naming patterns</p>
                    <div className="flex justify-between text-sm mb-1 font-bold text-slate-700">
                        <span>Compliance</span><span>{data.namingCompliancePercent || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${data.namingCompliancePercent || 0}%` }}></div>
                    </div>
                </div>
           </div>
       </ExpandableSection>

       {/* Orphaned / Zombie Resources */}
       <ExpandableSection title="Zombie & Orphaned Resources" icon={<Ghost className="w-5 h-5" />} badge={`${(data.orphanedResources || []).length} found`} badgeColor="bg-orange-100 text-orange-700">
           {(data.orphanedResources || []).length === 0 ? (
               <div className="text-center py-6 text-green-600 bg-green-50 rounded-xl">No orphaned resources found!</div>
           ) : (
               <div className="space-y-2">
                   {(data.orphanedResources || []).map((res, idx) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                           <div>
                               <div className="font-bold text-slate-900 text-sm">{res.name}</div>
                               <div className="text-xs text-slate-500">{res.type}</div>
                           </div>
                           <span className="text-sm font-bold text-orange-600">${res.estimatedMonthlyCost}/mo</span>
                       </div>
                   ))}
                   <div className="text-right text-sm font-bold text-orange-700 mt-2">
                       Total waste: ${(data.orphanedResources || []).reduce((s, r) => s + r.estimatedMonthlyCost, 0)}/mo
                   </div>
               </div>
           )}
       </ExpandableSection>

       {/* Subscription Quotas */}
       <ExpandableSection title="Subscription Quotas & Limits" icon={<Gauge className="w-5 h-5" />} badge={`${(data.subscriptionQuotas || []).length} tracked`}>
           <div className="space-y-4">
               {(data.subscriptionQuotas || []).map((quota, idx) => (
                   <div key={idx}>
                       <div className="flex justify-between text-sm mb-1">
                           <span className="font-medium text-slate-700">{quota.name}</span>
                           <span className="font-bold text-slate-900">{quota.currentUsage} / {quota.limit}</span>
                       </div>
                       <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full ${quota.limit > 0 && (quota.currentUsage / quota.limit) > 0.8 ? 'bg-red-500' : (quota.currentUsage / quota.limit) > 0.5 ? 'bg-orange-500' : 'bg-green-500'}`}
                                style={{ width: `${quota.limit > 0 ? Math.min(100, (quota.currentUsage / quota.limit) * 100) : 0}%` }}></div>
                       </div>
                   </div>
               ))}
               {(data.subscriptionQuotas || []).length === 0 && (
                   <div className="text-center py-6 text-slate-400">No quota data available.</div>
               )}
           </div>
       </ExpandableSection>
    </div>
  );
};

export default GovernanceDashboard;
