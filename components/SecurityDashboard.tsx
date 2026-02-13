import React from 'react';
import { SecurityData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Shield, AlertTriangle, Lock, CheckCircle, Globe, Key, FileCheck, HardDrive } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

const SecurityDashboard: React.FC<{ data: SecurityData }> = ({ data }) => {
  const pieData = [
    { name: 'Secure', value: data.score || 0, color: '#3B82F6' },
    { name: 'Vulnerable', value: 100 - (data.score || 0), color: '#F1F5F9' },
  ];

  return (
    <div className="space-y-6">
       {/* Top Stats Row */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Shield className="w-5 h-5" /></div>
             </div>
             <div className="text-2xl font-bold text-slate-900">{data.score > 0 ? `${data.score}%` : 'N/A'}</div>
             <div className="text-sm text-slate-500 mt-1">Secure Score</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-red-50 rounded-lg text-red-600"><AlertTriangle className="w-5 h-5" /></div>
             </div>
             <div className="text-2xl font-bold text-slate-900">{data.activeThreats}</div>
             <div className="text-sm text-slate-500 mt-1">Active Threats</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><Lock className="w-5 h-5" /></div>
             </div>
             <div className="text-2xl font-bold text-slate-900">{data.criticalVulnerabilities}</div>
             <div className="text-sm text-slate-500 mt-1">Critical Vulns</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-green-50 rounded-lg text-green-600"><CheckCircle className="w-5 h-5" /></div>
             </div>
             <div className="text-2xl font-bold text-slate-900">{data.complianceScore > 0 ? `${data.complianceScore}%` : 'N/A'}</div>
             <div className="text-sm text-slate-500 mt-1">Compliance</div>
          </div>
       </div>

       {/* Score Breakdown + Alerts — always visible */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
               <h3 className="text-lg font-bold text-slate-900 w-full text-left mb-4">Score Breakdown</h3>
               <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={pieData} innerRadius={50} outerRadius={70} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                              {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                          </Pie>
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-3xl font-bold text-slate-900">{data.score || 0}%</span>
                       <span className="text-xs text-slate-400 uppercase tracking-widest mt-1">Secure</span>
                  </div>
               </div>
           </div>

           <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-lg font-bold text-slate-900 mb-4">Security Alerts</h3>
               <div className="space-y-3">
                   {data.alerts.length === 0 ? (
                       <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">No active alerts detected.</div>
                   ) : (
                       data.alerts.map((alert, idx) => (
                           <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                               <div className="flex items-center gap-3">
                                   <div className={`w-1.5 h-8 rounded-full ${alert.severity === 'High' ? 'bg-red-500' : alert.severity === 'Medium' ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                                   <div>
                                       <p className="font-semibold text-slate-900 text-sm">{alert.description}</p>
                                       <p className="text-xs text-slate-500">{alert.time}</p>
                                   </div>
                               </div>
                               <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${alert.severity === 'High' ? 'bg-red-100 text-red-600' : alert.severity === 'Medium' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                   {alert.severity}
                               </span>
                           </div>
                       ))
                   )}
               </div>
           </div>
       </div>

       {/* Regulatory Compliance */}
       <ExpandableSection title="Regulatory Compliance" icon={<FileCheck className="w-5 h-5" />} badge={`${(data.regulatoryCompliance || []).length} frameworks`}>
          <div className="space-y-4">
              {(data.regulatoryCompliance || []).map((reg, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex-1">
                          <div className="font-bold text-slate-900 text-sm">{reg.framework}</div>
                          <div className="flex gap-4 mt-2 text-xs">
                              <span className="text-green-600 font-bold">{reg.passedControls} passed</span>
                              <span className="text-red-600 font-bold">{reg.failedControls} failed</span>
                              <span className="text-slate-400">{reg.totalControls} total</span>
                          </div>
                      </div>
                      <div className="w-32">
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-green-500 h-full rounded-full" style={{ width: `${reg.totalControls > 0 ? (reg.passedControls / reg.totalControls) * 100 : 0}%` }}></div>
                          </div>
                          <div className="text-xs text-slate-500 text-right mt-1">
                              {reg.totalControls > 0 ? Math.round((reg.passedControls / reg.totalControls) * 100) : 0}%
                          </div>
                      </div>
                  </div>
              ))}
              {(data.regulatoryCompliance || []).length === 0 && (
                  <div className="text-center py-6 text-slate-400">No regulatory compliance data available.</div>
              )}
          </div>
       </ExpandableSection>

       {/* Network Security */}
       <ExpandableSection title="Network Security" icon={<Globe className="w-5 h-5" />} badge={data.networkSecurity?.publicIps || 0} badgeColor="bg-orange-100 text-orange-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-5 rounded-xl text-center">
                  <div className="text-3xl font-bold text-slate-900">{data.networkSecurity?.openNsgRules || 0}</div>
                  <div className="text-sm text-slate-500 mt-1">Open NSG Rules</div>
              </div>
              <div className="bg-slate-50 p-5 rounded-xl text-center">
                  <div className="text-3xl font-bold text-orange-600">{data.networkSecurity?.publicIps || 0}</div>
                  <div className="text-sm text-slate-500 mt-1">Public IP Addresses</div>
              </div>
              <div className="bg-red-50 p-5 rounded-xl text-center">
                  <div className="text-3xl font-bold text-red-600">{data.networkSecurity?.unprotectedEndpoints || 0}</div>
                  <div className="text-sm text-slate-500 mt-1">Unprotected Endpoints</div>
              </div>
          </div>
       </ExpandableSection>

       {/* Encryption Status */}
       <ExpandableSection title="Encryption Status" icon={<Lock className="w-5 h-5" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-5 rounded-xl flex items-center gap-4">
                  <HardDrive className="w-8 h-8 text-green-600" />
                  <div>
                      <div className="text-2xl font-bold text-green-700">{data.encryptionStatus?.encryptedResources || 0}</div>
                      <div className="text-sm text-green-600">Encrypted at Rest</div>
                  </div>
              </div>
              <div className={`p-5 rounded-xl flex items-center gap-4 ${(data.encryptionStatus?.unencryptedResources || 0) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <HardDrive className={`w-8 h-8 ${(data.encryptionStatus?.unencryptedResources || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                  <div>
                      <div className={`text-2xl font-bold ${(data.encryptionStatus?.unencryptedResources || 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>{data.encryptionStatus?.unencryptedResources || 0}</div>
                      <div className={`text-sm ${(data.encryptionStatus?.unencryptedResources || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>Unencrypted</div>
                  </div>
              </div>
          </div>
       </ExpandableSection>

       {/* Key Vault Health */}
       <ExpandableSection title="Key Vault Health" icon={<Key className="w-5 h-5" />} badge={`${data.keyVaultHealth?.expiringSecrets || 0} expiring`} badgeColor={(data.keyVaultHealth?.expiringSecrets || 0) > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-slate-900">{data.keyVaultHealth?.totalSecrets || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Total Secrets</div>
              </div>
              <div className={`p-4 rounded-xl text-center ${(data.keyVaultHealth?.expiringSecrets || 0) > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${(data.keyVaultHealth?.expiringSecrets || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>{data.keyVaultHealth?.expiringSecrets || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Expiring Secrets</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-slate-900">{data.keyVaultHealth?.totalCertificates || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Total Certificates</div>
              </div>
              <div className={`p-4 rounded-xl text-center ${(data.keyVaultHealth?.expiringCertificates || 0) > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${(data.keyVaultHealth?.expiringCertificates || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>{data.keyVaultHealth?.expiringCertificates || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Expiring Certs</div>
              </div>
          </div>
       </ExpandableSection>
    </div>
  );
};

export default SecurityDashboard;
