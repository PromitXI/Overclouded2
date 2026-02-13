import React from 'react';
import { MonitoringData } from '../types';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, HardDrive, Server, Clock, HeartPulse, ShieldCheck, Database, Disc } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

const MonitoringDashboard: React.FC<{ data: MonitoringData }> = ({ data }) => {

  return (
    <div className="space-y-6">
      {/* KPI Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl text-white shadow-xl">
        <h2 className="text-2xl font-bold mb-6">Operations & Monitoring</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{data.vmCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Virtual Machines</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{data.uptime}%</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Uptime</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{data.storageUsedTB} TB</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Storage Used</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-400">{data.activeUsers}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Active Users</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-400">
              {data.resourceHealth ? data.resourceHealth.healthy + data.resourceHealth.degraded + data.resourceHealth.unavailable : '—'}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Tracked Resources</div>
          </div>
        </div>
      </div>

      {/* CPU & Memory */}
      <ExpandableSection title="CPU Utilization" icon={<Cpu className="w-5 h-5" />} defaultOpen={true}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.cpuUsageHistory}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#cpuGrad)" name="CPU %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ExpandableSection>

      <ExpandableSection title="Memory Utilization" icon={<HardDrive className="w-5 h-5" />} defaultOpen={true}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.memoryUsageHistory}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fill="url(#memGrad)" name="Memory %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ExpandableSection>

      {/* Disk IOPS */}
      <ExpandableSection title="Disk I/O Performance" icon={<Disc className="w-5 h-5" />}>
        {(data.diskIops || []).length === 0 ? (
          <div className="text-center py-6 text-slate-400">No disk IOPS data available.</div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.diskIops}>
                <defs>
                  <linearGradient id="iopsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} fill="url(#iopsGrad)" name="IOPS" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ExpandableSection>

      {/* Service Health */}
      <ExpandableSection title="Azure Service Health" icon={<HeartPulse className="w-5 h-5" />} badge={`${(data.serviceHealth || []).filter(s => s.status !== 'Healthy').length} issues`} badgeColor="bg-orange-100 text-orange-700">
        {(data.serviceHealth || []).length === 0 ? (
          <div className="text-center py-6 text-slate-400">No service health data available.</div>
        ) : (
          <div className="space-y-3">
            {data.serviceHealth.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.status === 'Healthy' ? 'bg-green-500' : item.status === 'Degraded' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{item.service}</div>
                    <div className="text-xs text-slate-500">{item.summary}</div>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${item.status === 'Healthy' ? 'bg-green-100 text-green-700' : item.status === 'Degraded' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </ExpandableSection>

      {/* Resource Health */}
      <ExpandableSection title="Resource Health Overview" icon={<ShieldCheck className="w-5 h-5" />}>
        {data.resourceHealth ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-5 rounded-xl text-center">
              <div className="text-3xl font-bold text-green-600">{data.resourceHealth.healthy}</div>
              <div className="text-sm text-slate-500 mt-1">Healthy</div>
            </div>
            <div className="bg-orange-50 p-5 rounded-xl text-center">
              <div className="text-3xl font-bold text-orange-600">{data.resourceHealth.degraded}</div>
              <div className="text-sm text-slate-500 mt-1">Degraded</div>
            </div>
            <div className="bg-red-50 p-5 rounded-xl text-center">
              <div className="text-3xl font-bold text-red-600">{data.resourceHealth.unavailable}</div>
              <div className="text-sm text-slate-500 mt-1">Unavailable</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">No resource health data available.</div>
        )}
      </ExpandableSection>

      {/* Backup Coverage */}
      <ExpandableSection title="Backup Coverage" icon={<Database className="w-5 h-5" />}>
        {data.backupCoverage ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-5 rounded-xl text-center">
              <ShieldCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-600">{data.backupCoverage.protectedResources}</div>
              <div className="text-sm text-slate-500 mt-1">Protected Resources</div>
            </div>
            <div className="bg-red-50 p-5 rounded-xl text-center">
              <Server className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-red-600">{data.backupCoverage.unprotectedResources}</div>
              <div className="text-sm text-slate-500 mt-1">Unprotected Resources</div>
            </div>
            <div className="col-span-full">
              <div className="flex justify-between text-sm mb-1 font-bold text-slate-700">
                <span>Backup Coverage</span>
                <span>
                  {data.backupCoverage.protectedResources + data.backupCoverage.unprotectedResources > 0
                    ? Math.round((data.backupCoverage.protectedResources / (data.backupCoverage.protectedResources + data.backupCoverage.unprotectedResources)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full rounded-full"
                  style={{ width: `${data.backupCoverage.protectedResources + data.backupCoverage.unprotectedResources > 0
                    ? (data.backupCoverage.protectedResources / (data.backupCoverage.protectedResources + data.backupCoverage.unprotectedResources)) * 100
                    : 0}%` }}>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">No backup coverage data available.</div>
        )}
      </ExpandableSection>
    </div>
  );
};

export default MonitoringDashboard;
