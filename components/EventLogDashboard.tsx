import React from 'react';
import { ActivityLogEntry, DevOpsData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, FileText, AlertTriangle, Rocket, Activity, CheckCircle, XCircle, Loader, Ban } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

const EventLogDashboard: React.FC<{ data: ActivityLogEntry[]; devops?: DevOpsData }> = ({ data, devops }) => {
  const succeededCount = data.filter(e => e.status === 'Succeeded').length;
  const failedCount = data.filter(e => e.status === 'Failed').length;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'Succeeded': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'Running': case 'Started': return <Loader className="w-4 h-4 text-blue-500" />;
      case 'Canceled': return <Ban className="w-4 h-4 text-slate-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const deployStatusColor = (status: string) => {
    switch (status) {
      case 'Succeeded': return 'bg-green-100 text-green-700';
      case 'Failed': return 'bg-red-100 text-red-700';
      case 'Running': return 'bg-blue-100 text-blue-700';
      case 'Canceled': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl text-white shadow-xl">
        <h2 className="text-2xl font-bold mb-6">Activity Logs & DevOps</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{data.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Total Events</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{succeededCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Succeeded</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">{failedCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Failed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{devops?.deployments?.length || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Deployments</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-400">{devops?.failedOperationsSummary?.length || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Failure Types</div>
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      <ExpandableSection title="Activity Log" icon={<FileText className="w-5 h-5" />} badge={data.length} defaultOpen={true}>
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Time</th>
                <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Operation</th>
                <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Status</th>
                <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase hidden md:table-cell">Caller</th>
                <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase hidden lg:table-cell">Resource Group</th>
              </tr>
            </thead>
            <tbody>
              {data.map((event) => (
                <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 text-slate-500 text-xs whitespace-nowrap">{new Date(event.timestamp).toLocaleString()}</td>
                  <td className="py-2 font-medium text-slate-800 text-xs max-w-[220px] truncate">{event.description || event.operationName}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      {statusIcon(event.status)}
                      <span className={`text-xs font-bold ${event.status === 'Succeeded' ? 'text-green-600' : event.status === 'Failed' ? 'text-red-600' : 'text-slate-500'}`}>
                        {event.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-slate-500 text-xs hidden md:table-cell max-w-[150px] truncate">{event.caller}</td>
                  <td className="py-2 text-slate-500 text-xs hidden lg:table-cell">{event.resourceGroup}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ExpandableSection>

      {/* Deployment History */}
      <ExpandableSection title="Deployment History" icon={<Rocket className="w-5 h-5" />} badge={devops?.deployments?.length || 0}>
        {(!devops?.deployments || devops.deployments.length === 0) ? (
          <div className="text-center py-6 text-slate-400">No deployment data available.</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Deployment</th>
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Resource Group</th>
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Status</th>
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Time</th>
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Duration</th>
                </tr>
              </thead>
              <tbody>
                {devops.deployments.map((dep) => (
                  <tr key={dep.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-800 text-xs max-w-[200px] truncate">{dep.name}</td>
                    <td className="py-2 text-slate-500 text-xs">{dep.resourceGroup}</td>
                    <td className="py-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${deployStatusColor(dep.status)}`}>
                        {dep.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500 text-xs whitespace-nowrap">{new Date(dep.timestamp).toLocaleDateString()}</td>
                    <td className="py-2 text-slate-500 text-xs">{dep.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ExpandableSection>

      {/* Change Velocity */}
      <ExpandableSection title="Change Velocity" icon={<Activity className="w-5 h-5" />}>
        {(!devops?.changeVelocity || devops.changeVelocity.length === 0) ? (
          <div className="text-center py-6 text-slate-400">No change velocity data available.</div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={devops.changeVelocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="changes" radius={[6, 6, 0, 0]} name="Changes">
                  {devops.changeVelocity.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? '#3B82F6' : '#60A5FA'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ExpandableSection>

      {/* Failed Operations Summary */}
      <ExpandableSection title="Failed Operations Summary" icon={<AlertTriangle className="w-5 h-5" />} badge={devops?.failedOperationsSummary?.length || 0} badgeColor="bg-red-100 text-red-700">
        {(!devops?.failedOperationsSummary || devops.failedOperationsSummary.length === 0) ? (
          <div className="text-center py-6 text-green-600 bg-green-50 rounded-xl">No failed operations recorded!</div>
        ) : (
          <div className="space-y-2">
            {devops.failedOperationsSummary.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <span className="text-sm font-medium text-slate-800">{item.operation}</span>
                <span className="text-sm font-bold text-red-700">{item.count} failures</span>
              </div>
            ))}
          </div>
        )}
      </ExpandableSection>
    </div>
  );
};

export default EventLogDashboard;
