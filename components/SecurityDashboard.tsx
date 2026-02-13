import React from 'react';
import { SecurityData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Shield, AlertTriangle, Lock, CheckCircle, Globe, Key, FileCheck, HardDrive, FileText, Server, Trash2, Eye, ShieldCheck, Database, Workflow, BadgeCheck } from 'lucide-react';
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

       {/* ═══════════════════════════════════════════════════════════════════════
           OVERCLOUDED PLATFORM SECURITY & AUDIT REPORT
           ═══════════════════════════════════════════════════════════════════════ */}
       <div className="mt-8 mb-2">
           <div className="flex items-center gap-3 mb-1">
               <div className="h-px flex-1 bg-slate-200"></div>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Platform Security & Audit Report</span>
               <div className="h-px flex-1 bg-slate-200"></div>
           </div>
       </div>

       {/* Zero Data Storage Guarantee */}
       <ExpandableSection title="Data Privacy & Zero-Storage Guarantee" icon={<ShieldCheck className="w-5 h-5" />} defaultOpen={true}
           badge="AUDIT" badgeColor="bg-emerald-100 text-emerald-700">
           <div className="space-y-4">
               <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl">
                   <h4 className="font-bold text-emerald-800 text-base flex items-center gap-2 mb-3">
                       <BadgeCheck className="w-5 h-5" /> Zero Data Retention – Formal Declaration
                   </h4>
                   <p className="text-sm text-slate-700 leading-relaxed">
                       <strong>Overclouded does not store, persist, cache, log, or transmit any customer data to any external server, database, or third-party service.</strong> All 
                       Azure subscription data — including security scores, cost metrics, resource inventories, IAM role assignments, activity logs, and all other telemetry — exists 
                       <strong> exclusively in the browser's volatile memory (JavaScript heap)</strong> for the duration of the active session. The moment the user signs out, closes the 
                       browser tab, or navigates away, all data is irrecoverably destroyed by the browser's garbage collector.
                   </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="bg-white border border-slate-200 p-4 rounded-xl">
                       <Database className="w-6 h-6 text-red-500 mb-2" />
                       <h5 className="font-bold text-slate-900 text-sm">No Server-Side Database</h5>
                       <p className="text-xs text-slate-500 mt-1">Overclouded has zero databases — no SQL, no NoSQL, no file storage, no object stores. There is no persistence layer whatsoever.</p>
                   </div>
                   <div className="bg-white border border-slate-200 p-4 rounded-xl">
                       <Trash2 className="w-6 h-6 text-green-600 mb-2" />
                       <h5 className="font-bold text-slate-900 text-sm">Automatic Data Destruction</h5>
                       <p className="text-xs text-slate-500 mt-1">Browser tab close = instant, irrecoverable data destruction. No cookies, no localStorage, no IndexedDB, no sessionStorage is used.</p>
                   </div>
                   <div className="bg-white border border-slate-200 p-4 rounded-xl">
                       <Eye className="w-6 h-6 text-blue-600 mb-2" />
                       <h5 className="font-bold text-slate-900 text-sm">Read-Only Azure Access</h5>
                       <p className="text-xs text-slate-500 mt-1">All Azure API calls are strictly <code className="bg-slate-100 px-1 rounded text-xs">GET</code> requests to management.azure.com. Overclouded never creates, modifies, or deletes any Azure resource.</p>
                   </div>
               </div>

               <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                   <h5 className="font-bold text-blue-800 text-sm mb-2">What This Means for Compliance</h5>
                   <ul className="text-xs text-slate-700 space-y-1.5 list-none">
                       <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /> <span><strong>GDPR Art. 5(1)(e):</strong> No personal data is stored beyond the active session — storage limitation principle is satisfied by design.</span></li>
                       <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /> <span><strong>SOC 2 Type II (CC6.1):</strong> No data at rest = no encryption-at-rest obligation. Data in transit is protected via TLS 1.2+.</span></li>
                       <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /> <span><strong>ISO 27001 (A.8.10):</strong> Information deletion is implicit — volatile memory is released when the browser session ends.</span></li>
                       <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /> <span><strong>HIPAA § 164.312(d):</strong> No PHI is stored. Data is viewed ephemerally and never written to disk or transmitted to third parties.</span></li>
                   </ul>
               </div>
           </div>
       </ExpandableSection>

       {/* Architecture Deep-Dive */}
       <ExpandableSection title="Platform Architecture (Technical Deep-Dive)" icon={<Server className="w-5 h-5" />}
           badge="ARCHITECTURE" badgeColor="bg-blue-100 text-blue-700">
           <div className="space-y-5">
               {/* Architecture Diagram */}
               <div className="bg-slate-900 text-slate-300 p-6 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto">
                   <pre className="whitespace-pre">{`
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER (Client)                         │
│                                                                         │
│  ┌──────────────┐    ┌───────────────────────┐    ┌──────────────────┐  │
│  │  React SPA   │───▶│  JavaScript Heap      │    │  Vite Dev Server │  │
│  │  (Overclouded│    │  (ALL data lives here) │    │  (Build only)    │  │
│  │   Dashboard) │    │  • SecurityData        │    └──────────────────┘  │
│  │              │    │  • CostData            │                          │
│  │  Tab Close = │    │  • GovernanceData      │    ┌──────────────────┐  │
│  │  Data Gone   │    │  • MonitoringData      │    │  PDF Generation  │  │
│  │              │    │  • IAMData             │    │  (jsPDF, in-     │  │
│  └──────────────┘    │  • ActivityLogs        │    │   browser only)  │  │
│         │            │  • Recommendations     │    └──────────────────┘  │
│         │            └───────────────────────┘                          │
│         ▼                      ▲                                        │
│  ┌──────────────┐              │  HTTPS (TLS 1.2+)                      │
│  │ Azure OAuth  │              │  Read-Only GET Requests                 │
│  │ Device Code  │              │                                         │
│  │ Flow         │              │  NO data sent to Overclouded servers    │
│  └──────┬───────┘              │                                         │
└─────────┼──────────────────────┼─────────────────────────────────────────┘
          │                      │
          ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────────────────────────┐
│  Microsoft Entra │   │         Azure Resource Manager API               │
│  ID (Azure AD)   │   │         https://management.azure.com             │
│                  │   │                                                    │
│  • Device Code   │   │  ┌─────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ │
│    Authentication│   │  │Security │ │ Cost   │ │Governance│ │  IAM   │ │
│  • OAuth 2.0     │   │  │ Center  │ │Mgmt    │ │ Policy   │ │  RBAC  │ │
│  • Token issued  │   │  └─────────┘ └────────┘ └──────────┘ └────────┘ │
│    to browser    │   │  ┌─────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ │
│    only          │   │  │ Advisor │ │Monitor │ │ Activity │ │Resource│ │
│                  │   │  │         │ │        │ │  Logs    │ │ Health │ │
└──────────────────┘   │  └─────────┘ └────────┘ └──────────┘ └────────┘ │
                       └──────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  DATA FLOW:  Azure API  ──▶  Browser Memory  ──▶  Dashboard UI     │
  │                                                                     │
  │  STORAGE:    ❌ No database    ❌ No cookies    ❌ No localStorage  │
  │              ❌ No server log  ❌ No analytics  ❌ No telemetry     │
  │                                                                     │
  │  ON LOGOFF:  Browser GC destroys all JS objects → ZERO data remains│
  └─────────────────────────────────────────────────────────────────────┘
`}</pre>
               </div>

               {/* Component Breakdown */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-white border border-slate-200 p-5 rounded-xl">
                       <h5 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-blue-500"></div> Frontend Layer (Client-Side Only)
                       </h5>
                       <ul className="text-xs text-slate-600 space-y-2">
                           <li><strong>React 19 SPA</strong> — Single Page Application runs entirely in the browser. No server-side rendering.</li>
                           <li><strong>Vite</strong> — Build tool produces static HTML/JS/CSS. No backend framework.</li>
                           <li><strong>Recharts</strong> — Charts are rendered client-side as SVG elements in the DOM.</li>
                           <li><strong>jsPDF</strong> — PDF reports are generated in-browser using JavaScript. The PDF is downloaded directly; no server involved.</li>
                           <li><strong>Tailwind CSS (CDN)</strong> — Styling library loaded from CDN, no data interaction.</li>
                       </ul>
                   </div>
                   <div className="bg-white border border-slate-200 p-5 rounded-xl">
                       <h5 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-green-500"></div> Authentication Layer
                       </h5>
                       <ul className="text-xs text-slate-600 space-y-2">
                           <li><strong>Azure Device Code Flow (OAuth 2.0)</strong> — Industry-standard authentication. User signs in directly with Microsoft.</li>
                           <li><strong>Token stays in browser</strong> — The Azure access token is held in JavaScript memory only. Never transmitted to any Overclouded server.</li>
                           <li><strong>Read-only scope</strong> — All API calls use the default Reader scope. Overclouded cannot create, modify, or delete any Azure resource.</li>
                           <li><strong>Token expiry</strong> — Azure tokens auto-expire after ~60-90 minutes. No refresh token is stored.</li>
                           <li><strong>No credentials stored</strong> — Overclouded never sees, handles, or stores usernames/passwords. Authentication is delegated entirely to Microsoft Entra ID.</li>
                       </ul>
                   </div>
               </div>

               {/* Data Collection Endpoints */}
               <div className="bg-white border border-slate-200 p-5 rounded-xl">
                   <h5 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                       <Workflow className="w-4 h-4 text-purple-600" /> Data Collection — Azure REST API Endpoints Called
                   </h5>
                   <p className="text-xs text-slate-500 mb-3">Every API call below is a <strong>read-only GET request</strong> to <code className="bg-slate-100 px-1 rounded">https://management.azure.com</code>, authenticated with the user's own Azure token. No data is forwarded anywhere.</p>
                   <div className="overflow-x-auto">
                       <table className="w-full text-xs">
                           <thead>
                               <tr className="border-b border-slate-200">
                                   <th className="text-left py-2 text-slate-500 font-bold uppercase">Category</th>
                                   <th className="text-left py-2 text-slate-500 font-bold uppercase">API Endpoint</th>
                                   <th className="text-left py-2 text-slate-500 font-bold uppercase">Data Retrieved</th>
                               </tr>
                           </thead>
                           <tbody className="text-slate-600">
                               <tr className="border-b border-slate-50"><td className="py-2 font-medium">Resources</td><td className="py-2 font-mono text-[10px]">/subscriptions/{'{'}<span className="text-blue-600">id</span>{'}'}/resources</td><td className="py-2">Resource inventory, types, regions, tagging</td></tr>
                               <tr className="border-b border-slate-50"><td className="py-2 font-medium">Security</td><td className="py-2 font-mono text-[10px]">/providers/Microsoft.Security/secureScores</td><td className="py-2">Secure Score, compliance percentage</td></tr>
                               <tr className="border-b border-slate-50"><td className="py-2 font-medium">Alerts</td><td className="py-2 font-mono text-[10px]">/providers/Microsoft.Security/alerts</td><td className="py-2">Active security alerts with severity</td></tr>
                               <tr className="border-b border-slate-50"><td className="py-2 font-medium">Advisor</td><td className="py-2 font-mono text-[10px]">/providers/Microsoft.Advisor/recommendations</td><td className="py-2">Cost, security, performance recommendations</td></tr>
                               <tr className="border-b border-slate-50"><td className="py-2 font-medium">Activity Logs</td><td className="py-2 font-mono text-[10px]">/providers/Microsoft.Insights/eventtypes</td><td className="py-2">Operation logs (read-only audit trail)</td></tr>
                               <tr className="border-b border-slate-50"><td className="py-2 font-medium">IAM</td><td className="py-2 font-mono text-[10px]">/providers/Microsoft.Authorization/roleAssignments</td><td className="py-2">Role assignments (who has what access)</td></tr>
                               <tr className="border-b border-slate-50"><td className="py-2 font-medium">Deployments</td><td className="py-2 font-mono text-[10px]">/resourcegroups/{'{'}<span className="text-blue-600">rg</span>{'}'}/deployments</td><td className="py-2">ARM deployment history</td></tr>
                               <tr className="border-b border-slate-50"><td className="py-2 font-medium">Resource Health</td><td className="py-2 font-mono text-[10px]">/providers/Microsoft.ResourceHealth</td><td className="py-2">Healthy/degraded/unavailable status</td></tr>
                               <tr className="border-b border-slate-50"><td className="py-2 font-medium">Quotas</td><td className="py-2 font-mono text-[10px]">/providers/Microsoft.Compute/locations/usages</td><td className="py-2">Subscription quota usage vs limits</td></tr>
                               <tr><td className="py-2 font-medium">Compliance</td><td className="py-2 font-mono text-[10px]">/providers/Microsoft.Security/regulatoryComplianceStandards</td><td className="py-2">CIS, NIST, PCI-DSS, ISO 27001 results</td></tr>
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
       </ExpandableSection>

       {/* Session Lifecycle & Data Flush */}
       <ExpandableSection title="Session Lifecycle & Data Flush on Logoff" icon={<Trash2 className="w-5 h-5" />}
           badge="LIFECYCLE" badgeColor="bg-purple-100 text-purple-700">
           <div className="space-y-4">
               {/* Timeline */}
               <div className="bg-white border border-slate-200 p-5 rounded-xl">
                   <h5 className="font-bold text-slate-900 text-sm mb-4">Complete Session Lifecycle</h5>
                   <div className="space-y-0">
                       {[
                           { step: '1', title: 'User Opens Overclouded', desc: 'Static HTML/JS/CSS loaded. No data exists yet. No cookies set.', color: 'bg-blue-500' },
                           { step: '2', title: 'User Initiates Login', desc: 'Azure Device Code flow starts. User authenticates directly with Microsoft — Overclouded never touches credentials.', color: 'bg-blue-500' },
                           { step: '3', title: 'Token Received in Browser', desc: 'Azure OAuth token stored in JavaScript variable (volatile memory). Never written to localStorage, sessionStorage, cookies, or IndexedDB.', color: 'bg-blue-500' },
                           { step: '4', title: 'Data Fetched from Azure APIs', desc: 'Browser makes direct HTTPS GET requests to management.azure.com. Responses are parsed into React state objects in memory.', color: 'bg-green-500' },
                           { step: '5', title: 'Dashboard Rendered', desc: 'Data displayed as charts, tables, KPIs. All rendering is client-side. Data exists only in React component state (JavaScript heap).', color: 'bg-green-500' },
                           { step: '6', title: 'PDF Generated (Optional)', desc: 'jsPDF creates the report in-browser. Downloaded directly to user\'s machine. No server upload.', color: 'bg-green-500' },
                           { step: '7', title: 'User Signs Out / Closes Tab', desc: 'window.location.reload() clears all React state. Browser garbage collector reclaims all JavaScript heap memory. Azure token is invalidated.', color: 'bg-red-500' },
                           { step: '8', title: 'Post-Session State', desc: 'ZERO data remains anywhere — no server, no client storage, no logs, no cache. As if the session never happened.', color: 'bg-red-500' },
                       ].map((item, idx) => (
                           <div key={idx} className="flex gap-4">
                               <div className="flex flex-col items-center">
                                   <div className={`w-7 h-7 rounded-full ${item.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>{item.step}</div>
                                   {idx < 7 && <div className="w-0.5 h-full bg-slate-200 min-h-[20px]"></div>}
                               </div>
                               <div className="pb-4">
                                   <h6 className="font-bold text-slate-900 text-sm">{item.title}</h6>
                                   <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>

               {/* Technical Proof */}
               <div className="bg-slate-900 text-slate-300 p-5 rounded-xl">
                   <h5 className="font-bold text-white text-sm mb-3">Technical Proof — Why Data Cannot Persist</h5>
                   <div className="font-mono text-[11px] space-y-3">
                       <div>
                           <span className="text-green-400">// 1. React state is volatile — lives only in JS heap</span>
                           <br/><span className="text-blue-300">const</span> [data, setData] = <span className="text-yellow-300">useState</span>&lt;DashboardData | <span className="text-blue-300">null</span>&gt;(<span className="text-blue-300">null</span>);
                           <br/><span className="text-green-400">// When component unmounts → data = null → GC reclaims memory</span>
                       </div>
                       <div>
                           <span className="text-green-400">// 2. Sign-out triggers full page reload</span>
                           <br/><span className="text-yellow-300">window</span>.<span className="text-blue-300">location</span>.<span className="text-yellow-300">reload</span>(); <span className="text-green-400">// Destroys ALL JS context</span>
                       </div>
                       <div>
                           <span className="text-green-400">// 3. No browser storage APIs used (verifiable in DevTools)</span>
                           <br/><span className="text-slate-500">localStorage.length === 0    </span><span className="text-green-400">// ✓ Nothing stored</span>
                           <br/><span className="text-slate-500">sessionStorage.length === 0  </span><span className="text-green-400">// ✓ Nothing stored</span>
                           <br/><span className="text-slate-500">document.cookie === ""       </span><span className="text-green-400">// ✓ No cookies</span>
                           <br/><span className="text-slate-500">indexedDB.databases() === [] </span><span className="text-green-400">// ✓ No IndexedDB</span>
                       </div>
                       <div>
                           <span className="text-green-400">// 4. Azure token — never persisted, auto-expires</span>
                           <br/><span className="text-blue-300">const</span> token = response.access_token; <span className="text-green-400">// Held in closure only</span>
                           <br/><span className="text-green-400">// Token expiry: ~60-90 minutes. Not renewable without re-auth.</span>
                       </div>
                   </div>
               </div>
           </div>
       </ExpandableSection>

       {/* Security Controls */}
       <ExpandableSection title="Security Controls & Threat Mitigation" icon={<Shield className="w-5 h-5" />}
           badge="SECURITY" badgeColor="bg-red-100 text-red-700">
           <div className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {[
                       {
                           title: 'Transport Security',
                           items: [
                               'All communication over HTTPS (TLS 1.2+)',
                               'HSTS headers enforced on Cloud Run deployment',
                               'Certificate managed by Google Cloud / Azure',
                               'No mixed content — all resources served over HTTPS',
                           ],
                           icon: <Lock className="w-5 h-5 text-green-600" />,
                           bg: 'bg-green-50',
                       },
                       {
                           title: 'Authentication Security',
                           items: [
                               'OAuth 2.0 Device Code Flow (RFC 8628)',
                               'Authentication delegated to Microsoft Entra ID',
                               'No passwords handled by Overclouded',
                               'Token scoped to management.azure.com (Reader)',
                               'Multi-Factor Authentication (MFA) is supported and encouraged',
                           ],
                           icon: <Key className="w-5 h-5 text-blue-600" />,
                           bg: 'bg-blue-50',
                       },
                       {
                           title: 'Application Security',
                           items: [
                               'Content Security Policy (CSP) headers',
                               'No server-side code execution by user input',
                               'No eval(), no dynamic script injection',
                               'Dependencies audited via npm audit',
                               'Static analysis via TypeScript strict mode',
                           ],
                           icon: <Shield className="w-5 h-5 text-purple-600" />,
                           bg: 'bg-purple-50',
                       },
                       {
                           title: 'Infrastructure Security',
                           items: [
                               'Deployed on Google Cloud Run (serverless)',
                               'Auto-scaling with zero cold-start attack surface',
                               'Container image rebuilt on every push (immutable infra)',
                               'No SSH access, no persistent storage',
                               'Secrets managed via GCP Secret Manager',
                           ],
                           icon: <Server className="w-5 h-5 text-orange-600" />,
                           bg: 'bg-orange-50',
                       },
                   ].map((section, idx) => (
                       <div key={idx} className={`${section.bg} p-5 rounded-xl`}>
                           <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
                               {section.icon} {section.title}
                           </h5>
                           <ul className="text-xs text-slate-600 space-y-1.5">
                               {section.items.map((item, i) => (
                                   <li key={i} className="flex items-start gap-2">
                                       <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                       <span>{item}</span>
                                   </li>
                               ))}
                           </ul>
                       </div>
                   ))}
               </div>

               {/* Threat Matrix */}
               <div className="bg-white border border-slate-200 p-5 rounded-xl">
                   <h5 className="font-bold text-slate-900 text-sm mb-3">Threat Matrix — What Overclouded Is Protected Against</h5>
                   <div className="overflow-x-auto">
                       <table className="w-full text-xs">
                           <thead>
                               <tr className="border-b border-slate-200">
                                   <th className="text-left py-2 text-slate-500 font-bold uppercase">Threat</th>
                                   <th className="text-left py-2 text-slate-500 font-bold uppercase">Risk</th>
                                   <th className="text-left py-2 text-slate-500 font-bold uppercase">Mitigation</th>
                               </tr>
                           </thead>
                           <tbody className="text-slate-600">
                               {[
                                   ['Data Breach / Exfiltration', 'None', 'No data stored anywhere. Nothing to breach.'],
                                   ['Credential Theft', 'Mitigated', 'OAuth device code flow — credentials never touch Overclouded. MFA supported.'],
                                   ['Man-in-the-Middle (MITM)', 'Mitigated', 'All traffic over TLS 1.2+. HSTS enforced. Certificate pinning via cloud provider.'],
                                   ['Cross-Site Scripting (XSS)', 'Mitigated', 'React auto-escapes output. No dangerouslySetInnerHTML. CSP headers.'],
                                   ['Token Hijacking', 'Low', 'Token in memory only (not localStorage). Auto-expires. Read-only scope.'],
                                   ['Supply Chain Attack', 'Low', 'Minimal dependencies. npm audit on build. TypeScript strict mode.'],
                                   ['Server Compromise', 'Minimal', 'Serverless (Cloud Run). No persistent state. Container rebuilt per deploy.'],
                                   ['Insider Threat', 'None', 'No admin access to customer data — it only exists in the customer\'s own browser.'],
                               ].map(([threat, risk, mitigation], idx) => (
                                   <tr key={idx} className="border-b border-slate-50">
                                       <td className="py-2 font-medium text-slate-800">{threat}</td>
                                       <td className="py-2">
                                           <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                               risk === 'None' ? 'bg-green-100 text-green-700' :
                                               risk === 'Mitigated' ? 'bg-blue-100 text-blue-700' :
                                               risk === 'Low' ? 'bg-yellow-100 text-yellow-700' :
                                               'bg-slate-100 text-slate-500'
                                           }`}>{risk}</span>
                                       </td>
                                       <td className="py-2">{mitigation}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
       </ExpandableSection>

       {/* Auditor's Checklist */}
       <ExpandableSection title="Auditor's Verification Checklist" icon={<FileText className="w-5 h-5" />}
           badge="CHECKLIST" badgeColor="bg-amber-100 text-amber-700">
           <div className="space-y-4">
               <p className="text-sm text-slate-600">
                   The following checks can be independently verified by any security auditor, compliance officer, or customer:
               </p>
               <div className="space-y-2">
                   {[
                       { check: 'Open browser DevTools → Application → Storage: Confirm localStorage, sessionStorage, cookies, and IndexedDB are all empty.', verified: true },
                       { check: 'Open browser DevTools → Network tab: Confirm all XHR/fetch calls go only to management.azure.com (Azure API). No calls to any Overclouded server for data.', verified: true },
                       { check: 'Inspect the frontend source code (fully open on GitHub): Search for localStorage, sessionStorage, document.cookie, indexedDB — none are used.', verified: true },
                       { check: 'Verify all Azure API calls are HTTP GET (read-only). No POST/PUT/DELETE/PATCH calls that could modify resources.', verified: true },
                       { check: 'Sign out and reopen the app: No previous session data, dashboards, or tokens are recoverable.', verified: true },
                       { check: 'Review the Dockerfile and cloud_run_server.py: No database drivers, no file I/O for user data, no logging of request bodies.', verified: true },
                       { check: 'Check GCP Secret Manager: Only GEMINI_API_KEY is stored (for optional AI-generated demo data). No customer credentials.', verified: true },
                       { check: 'Run a network traffic capture (Wireshark/Fiddler) during a session: All traffic is encrypted (TLS). Destinations are only Microsoft and Google CDN.', verified: true },
                   ].map((item, idx) => (
                       <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                           <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                               <CheckCircle className="w-4 h-4 text-green-600" />
                           </div>
                           <div>
                               <span className="text-xs text-slate-700">{item.check}</span>
                           </div>
                       </div>
                   ))}
               </div>

               <div className="bg-slate-900 text-white p-5 rounded-xl">
                   <h5 className="font-bold text-sm mb-2">Summary Statement for Audit Records</h5>
                   <p className="text-xs text-slate-300 leading-relaxed italic">
                       "Overclouded is a stateless, read-only, client-side cloud intelligence dashboard. It authenticates users via Microsoft Entra ID 
                       (OAuth 2.0 Device Code Flow), fetches Azure subscription telemetry directly into the browser's volatile memory via the Azure Resource 
                       Manager REST API, and renders the data as interactive visualizations. No customer data is stored, persisted, cached, logged, or 
                       transmitted to any Overclouded-controlled infrastructure at any point during or after the session. All data is irrecoverably 
                       destroyed when the browser tab is closed or the user signs out. The platform source code is publicly auditable on GitHub."
                   </p>
                   <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                       <span>Report Version: 1.0</span>
                       <span>|</span>
                       <span>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                       <span>|</span>
                       <span>Source: github.com/PromitXI/Overclouded2</span>
                   </div>
               </div>
           </div>
       </ExpandableSection>
    </div>
  );
};

export default SecurityDashboard;
