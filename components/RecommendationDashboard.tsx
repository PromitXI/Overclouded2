import React from 'react';
import { RecommendationData } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Lightbulb, DollarSign, Shield, Zap, RefreshCw, Check, ArrowRight } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

const RecommendationDashboard: React.FC<{ data: RecommendationData }> = ({ data }) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const costItems = data.items.filter(i => i.category === 'Cost');
  const securityItems = data.items.filter(i => i.category === 'Security');
  const perfItems = data.items.filter(i => i.category === 'Performance');
  const reliabilityItems = data.items.filter(i => i.category === 'Reliability');

  const categoryData = [
    { name: 'Cost', value: costItems.length },
    { name: 'Security', value: securityItems.length },
    { name: 'Performance', value: perfItems.length },
    { name: 'Reliability', value: reliabilityItems.length },
  ].filter(d => d.value > 0);

  const highImpact = data.items.filter(i => i.impact === 'High');

  const impactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-orange-100 text-orange-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'Cost': return <DollarSign className="w-4 h-4 text-blue-500" />;
      case 'Security': return <Shield className="w-4 h-4 text-green-500" />;
      case 'Performance': return <Zap className="w-4 h-4 text-orange-500" />;
      case 'Reliability': return <RefreshCw className="w-4 h-4 text-red-500" />;
      default: return <Lightbulb className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl text-white shadow-xl">
        <h2 className="text-2xl font-bold mb-6">Advisor Recommendations</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{data.items.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">{highImpact.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">High Impact</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">${data.monthlySavings.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Monthly Savings</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{data.efficiencyScore}%</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Efficiency</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-400">{categoryData.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Categories</div>
          </div>
        </div>
      </div>

      {/* High Impact */}
      <ExpandableSection title="High Impact Recommendations" icon={<Lightbulb className="w-5 h-5" />} badge={highImpact.length} badgeColor="bg-red-100 text-red-700" defaultOpen={true}>
        {highImpact.length === 0 ? (
          <div className="text-center py-6 text-green-600 bg-green-50 rounded-xl">No high-impact recommendations!</div>
        ) : (
          <div className="space-y-3">
            {highImpact.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
                <div className="mt-0.5">{categoryIcon(item.category)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${impactColor(item.impact)}`}>{item.impact}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">{item.category}</span>
                    {item.savings && <span className="text-xs font-bold text-green-600">Save ${item.savings}/mo</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ExpandableSection>

      {/* By Category Breakdown */}
      <ExpandableSection title="Breakdown by Category" icon={<ArrowRight className="w-5 h-5" />}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {categoryData.map((_, idx) => (<Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2 space-y-2">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-sm text-slate-700">{cat.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{cat.value} recommendations</span>
              </div>
            ))}
          </div>
        </div>
      </ExpandableSection>

      {/* Cost Recommendations */}
      {costItems.length > 0 && (
        <ExpandableSection title="Cost Optimization" icon={<DollarSign className="w-5 h-5" />} badge={costItems.length}>
          <div className="space-y-2">
            {costItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <DollarSign className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{item.description}</p>
                  {item.savings && <span className="text-xs font-bold text-green-600 mt-1 inline-block">Save ${item.savings}/mo</span>}
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0 ${impactColor(item.impact)}`}>{item.impact}</span>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}

      {/* Security Recommendations */}
      {securityItems.length > 0 && (
        <ExpandableSection title="Security Hardening" icon={<Shield className="w-5 h-5" />} badge={securityItems.length}>
          <div className="space-y-2">
            {securityItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-800 flex-1">{item.description}</p>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0 ${impactColor(item.impact)}`}>{item.impact}</span>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}

      {/* Performance Recommendations */}
      {perfItems.length > 0 && (
        <ExpandableSection title="Performance Tuning" icon={<Zap className="w-5 h-5" />} badge={perfItems.length}>
          <div className="space-y-2">
            {perfItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <Zap className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-800 flex-1">{item.description}</p>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0 ${impactColor(item.impact)}`}>{item.impact}</span>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}

      {/* Reliability Recommendations */}
      {reliabilityItems.length > 0 && (
        <ExpandableSection title="Reliability Improvements" icon={<RefreshCw className="w-5 h-5" />} badge={reliabilityItems.length}>
          <div className="space-y-2">
            {reliabilityItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <RefreshCw className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-800 flex-1">{item.description}</p>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0 ${impactColor(item.impact)}`}>{item.impact}</span>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}
    </div>
  );
};

export default RecommendationDashboard;
