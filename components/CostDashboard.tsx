import React from 'react';
import { CostData } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, CreditCard, MapPin, Layers, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

const CostDashboard: React.FC<{ data: CostData }> = ({ data }) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
  const fmtCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
        
        {/* KPI Row — always visible */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Month-to-Date</h3>
                <div className="text-2xl font-bold text-slate-900">{fmtCurrency(data.currentMonthCost)}</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (data.currentMonthCost / (data.budget || 1)) * 100)}%` }}></div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Budget: {fmtCurrency(data.budget)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Forecast</h3>
                <div className="text-2xl font-bold text-slate-900">{fmtCurrency(data.forecastedCost)}</div>
                <div className="flex items-center gap-1 text-xs font-bold text-red-500 mt-2">
                    <TrendingUp className="w-3 h-3" />
                    {data.forecastedCost > data.budget ? `+${fmtCurrency(data.forecastedCost - data.budget)} over` : 'Under budget'}
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">RI Coverage</h3>
                <div className="text-2xl font-bold text-slate-900">{data.riCoverage}%</div>
                <div className="text-xs text-slate-500 mt-2">Reserved Instances</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">MoM Change</h3>
                <div className={`text-2xl font-bold ${(data.monthOverMonthChange || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {(data.monthOverMonthChange || 0) > 0 ? '+' : ''}{data.monthOverMonthChange || 0}%
                </div>
                <div className="flex items-center gap-1 text-xs mt-2">
                    {(data.monthOverMonthChange || 0) > 0 ? <ArrowUpRight className="w-3 h-3 text-red-400" /> : <ArrowDownRight className="w-3 h-3 text-green-400" />}
                    <span className="text-slate-500">vs Last Month</span>
                </div>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl shadow-sm border border-emerald-100">
                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Savings</h3>
                <div className="text-2xl font-bold text-emerald-700">{fmtCurrency(data.potentialSavings)}</div>
                <div className="text-xs text-emerald-600 mt-2">Potential / month</div>
            </div>
        </div>

        {/* Cost History & Forecast — Expandable */}
        <ExpandableSection title="Cost History & Forecast" icon={<TrendingUp className="w-5 h-5" />} defaultOpen={true}>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.costTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(v) => `$${v}`} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.costTrend.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.type === 'Forecast' ? '#93C5FD' : '#3B82F6'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </ExpandableSection>

        {/* Cost by Service — Expandable */}
        <ExpandableSection title="Cost by Service" icon={<DollarSign className="w-5 h-5" />} badge={`${data.costByService.length} services`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-[280px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data.costByService} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                                {data.costByService.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(value: number) => fmtCurrency(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                    {data.costByService.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="text-slate-700">{item.name}</span>
                            </div>
                            <span className="font-bold text-slate-900">{fmtCurrency(item.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </ExpandableSection>

        {/* Cost by Resource Group — Expandable */}
        <ExpandableSection title="Cost by Resource Group" icon={<Layers className="w-5 h-5" />} badge={`${(data.costByResourceGroup || []).length} groups`}>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.costByResourceGroup || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} tick={{fill: '#94a3b8', fontSize: 11}} />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={150} tick={{fill: '#334155', fontSize: 11}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(value: number) => fmtCurrency(value)} />
                        <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </ExpandableSection>

        {/* Cost by Region — Expandable */}
        <ExpandableSection title="Cost by Region" icon={<MapPin className="w-5 h-5" />} badge={`${(data.costByRegion || []).length} regions`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(data.costByRegion || []).map((region, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl text-center">
                        <div className="text-sm font-medium text-slate-500 mb-1">{region.name}</div>
                        <div className="text-xl font-bold text-slate-900">{fmtCurrency(region.value)}</div>
                    </div>
                ))}
            </div>
        </ExpandableSection>

        {/* Cost Anomalies — Expandable */}
        <ExpandableSection title="Cost Anomaly Detection" icon={<AlertTriangle className="w-5 h-5" />} badge={`${(data.costAnomalies || []).length} anomalies`} badgeColor="bg-red-100 text-red-700">
            {(data.costAnomalies || []).length === 0 ? (
                <div className="text-center py-8 text-slate-400">No cost anomalies detected — spending is normal.</div>
            ) : (
                <div className="space-y-3">
                    {(data.costAnomalies || []).map((anomaly, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                            <div>
                                <div className="font-bold text-slate-900 text-sm">{anomaly.service}</div>
                                <div className="text-xs text-slate-500">{anomaly.date}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-500">Expected: <span className="font-mono">{fmtCurrency(anomaly.expectedCost)}</span></div>
                                <div className="text-sm font-bold text-red-600">Actual: <span className="font-mono">{fmtCurrency(anomaly.actualCost)}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ExpandableSection>
    </div>
  );
};

export default CostDashboard;
