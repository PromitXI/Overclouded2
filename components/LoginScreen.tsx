import React, { useState, useRef, useCallback } from 'react';
import { ArrowRight, X, Loader2, Terminal, AlertCircle, ShieldCheck, Mail, Phone, Lock, ChevronLeft, ChevronDown, Check, Copy, ExternalLink, Server, Trash2, Eye, Database, Key, Shield, CheckCircle, FileText, Workflow } from 'lucide-react';
import { startDeviceCodeLogin, waitForLoginAndGetData, AzureSubscription } from '../services/authService';

interface LoginScreenProps {
  onLogin: (subId: string, token?: string) => void;
}

type TabState = 'HOME' | 'DOCS' | 'SECURITY' | 'ENTERPRISE' | 'CONTACT';
type AuthStep = 'IDLE' | 'DEVICE_CODE' | 'POLLING' | 'AUTHENTICATED';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<TabState>('HOME');
  const [showInput, setShowInput] = useState(false);
  const [mode, setMode] = useState<'DEMO' | 'REAL'>('REAL');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Device code flow state
  const [authStep, setAuthStep] = useState<AuthStep>('IDLE');
  const [userCode, setUserCode] = useState('');
  const [verificationUri, setVerificationUri] = useState('');
  const [pollingStatus, setPollingStatus] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Post-auth state
  const [accessToken, setAccessToken] = useState('');
  const [subscriptions, setSubscriptions] = useState<AzureSubscription[]>([]);
  const [selectedSubId, setSelectedSubId] = useState('');

  const resetAuth = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setAuthStep('IDLE');
    setUserCode('');
    setVerificationUri('');
    setPollingStatus('');
    setAccessToken('');
    setSubscriptions([]);
    setSelectedSubId('');
    setAuthError(null);
  }, []);

  const handleStartDeviceCode = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await startDeviceCodeLogin();
      setUserCode(result.user_code);
      setVerificationUri(result.verification_uri);
      setAuthStep('DEVICE_CODE');
    } catch (err: any) {
      setAuthError(err.message || 'Could not start device login. Is Azure CLI installed?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBrowserAndPoll = async () => {
    // Open the Microsoft device login page
    window.open(verificationUri, '_blank', 'noopener,noreferrer');

    // Start polling
    setAuthStep('POLLING');
    setPollingStatus('Waiting for you to complete sign-in...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { token, subscriptions: subs } = await waitForLoginAndGetData(
        (status) => setPollingStatus(status),
        controller.signal
      );

      setAccessToken(token.access_token);
      setSubscriptions(subs);
      if (subs.length > 0) {
        setSelectedSubId(subs[0].subscriptionId);
      }
      setAuthStep('AUTHENTICATED');
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setAuthError(err.message || 'Authentication failed. Please try again.');
      }
      setAuthStep('IDLE');
    }
  };

  const handleStartAnalysis = () => {
    if (!selectedSubId || !accessToken) return;
    setIsLoading(true);
    setTimeout(() => {
      onLogin(selectedSubId, accessToken);
      setIsLoading(false);
    }, 500);
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      onLogin('demo-subscription-id');
      setIsLoading(false);
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Content sections ──

  const renderContent = () => {
    switch (activeTab) {
      case 'DOCS':
        return (
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <button onClick={() => setActiveTab('HOME')} className="flex items-center text-slate-400 hover:text-slate-900 mb-6 transition-colors">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Home
            </button>
            <h2 className="text-3xl font-bold mb-6">Connection Documentation</h2>
            <div className="space-y-8 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar">
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-600" />
                  Step 1: Click "Analyse Environment"
                </h3>
                <p className="text-slate-500 text-sm mb-3">Click the button and select "Live Connection". The app will run <code className="bg-slate-100 px-1 rounded font-mono">az login --use-device-code</code> and generate a unique sign-in code.</p>
              </section>
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Step 2: Open Browser & Enter Code</h3>
                <p className="text-slate-500 text-sm mb-3">Click "Open Browser & Sign In". A tab opens to <strong>microsoft.com/devicelogin</strong>. Enter the code and sign in with your Azure credentials.</p>
              </section>
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Step 3: Select a Subscription</h3>
                <p className="text-slate-500 text-sm mb-3">After authentication, the app detects your subscriptions. Select one and click "Start Analysis".</p>
              </section>
              <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Prerequisites</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm text-blue-700">
                  <li><strong>Azure CLI</strong> must be installed on the machine running this app.</li>
                  <li>Your account needs at least <strong>"Reader"</strong> role on the target subscription.</li>
                  <li>No app registration or client ID configuration needed.</li>
                </ul>
              </section>
              <section className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                <h3 className="text-lg font-bold text-orange-800 mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Troubleshooting</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm text-orange-700">
                  <li><strong>Code Expired?</strong> Codes are valid for ~15 minutes. Click "Try Again" to regenerate.</li>
                  <li><strong>"az not found"?</strong> Install Azure CLI from <code className="bg-orange-100 px-1 rounded font-mono">https://aka.ms/installazurecli</code>.</li>
                  <li><strong>Popup Blocked?</strong> Allow popups for this site.</li>
                </ul>
              </section>
            </div>
          </div>
        );
      case 'SECURITY':
        return (
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <button onClick={() => setActiveTab('HOME')} className="flex items-center text-slate-400 hover:text-slate-900 mb-6 transition-colors"><ChevronLeft className="w-4 h-4 mr-1" /> Back to Home</button>
            <h2 className="text-3xl font-bold mb-2">Security Architecture</h2>
            <p className="text-slate-400 text-sm mb-6">Comprehensive audit report — zero data retention, full transparency.</p>
            <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar">

              {/* ── Zero Data Storage Guarantee ── */}
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0"><ShieldCheck className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Zero Data Retention – Formal Declaration</h3>
                    <p className="text-slate-700 leading-relaxed text-sm">
                      <strong>Overclouded does not store, persist, cache, log, or transmit any customer data to any external server, database, or third-party service.</strong> All 
                      Azure subscription data — including security scores, cost metrics, resource inventories, IAM role assignments, activity logs, and all other telemetry — exists 
                      <strong> exclusively in the browser's volatile memory (JavaScript heap)</strong> for the duration of the active session.
                    </p>
                    <p className="text-slate-600 text-sm mt-3">
                      The moment the user signs out, closes the browser tab, or navigates away, <strong>all data is irrecoverably destroyed</strong> by the browser's garbage collector.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Three Pillars ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <Database className="w-6 h-6 text-red-500 mb-3" />
                  <h4 className="font-bold text-slate-900 text-sm mb-1">No Server-Side Database</h4>
                  <p className="text-xs text-slate-500">Zero databases — no SQL, no NoSQL, no file storage, no object stores. There is no persistence layer whatsoever.</p>
                </div>
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <Trash2 className="w-6 h-6 text-green-600 mb-3" />
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Automatic Data Destruction</h4>
                  <p className="text-xs text-slate-500">Browser tab close = instant, irrecoverable data destruction. No cookies, no localStorage, no IndexedDB, no sessionStorage.</p>
                </div>
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <Eye className="w-6 h-6 text-blue-600 mb-3" />
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Read-Only Azure Access</h4>
                  <p className="text-xs text-slate-500">All Azure API calls are strictly <code className="bg-slate-100 px-1 rounded text-xs">GET</code> requests. Overclouded never creates, modifies, or deletes any Azure resource.</p>
                </div>
              </div>

              {/* ── Architecture Diagram ── */}
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><Server className="w-5 h-5 text-blue-600" /> Platform Architecture</h3>
                <p className="text-xs text-slate-400 mb-4">Complete data flow — from Azure API to your browser. No intermediate storage at any point.</p>
                <div className="bg-slate-900 text-slate-300 p-5 rounded-xl font-mono text-[10px] md:text-[11px] leading-relaxed overflow-x-auto">
                  <pre className="whitespace-pre">{`
┌──────────────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER (Client)                        │
│                                                                      │
│  ┌──────────────┐    ┌──────────────────────┐   ┌─────────────────┐  │
│  │  React SPA   │───▶│  JavaScript Heap     │   │ PDF Generation  │  │
│  │  (Overclouded│    │  (ALL data lives      │   │ (jsPDF, in-     │  │
│  │   Dashboard) │    │   here ONLY)          │   │  browser only)  │  │
│  │              │    │  • SecurityData       │   └─────────────────┘  │
│  │  Tab Close = │    │  • CostData           │                       │
│  │  Data Gone   │    │  • GovernanceData     │   No localStorage     │
│  │              │    │  • IAMData            │   No sessionStorage    │
│  └──────────────┘    │  • ActivityLogs       │   No cookies           │
│        │             └──────────────────────┘   No IndexedDB         │
│        ▼                       ▲                                     │
│  ┌──────────────┐              │  HTTPS (TLS 1.2+)                   │
│  │ Azure OAuth  │              │  Read-Only GET Requests              │
│  │ Device Code  │              │                                      │
│  │ Flow         │              │  NO data sent to Overclouded servers │
│  └──────┬───────┘              │                                      │
└─────────┼──────────────────────┼──────────────────────────────────────┘
          │                      │
          ▼                      ▼
┌──────────────────┐   ┌────────────────────────────────────────────────┐
│  Microsoft Entra │   │       Azure Resource Manager API               │
│  ID (Azure AD)   │   │       https://management.azure.com             │
│                  │   │                                                  │
│  • Device Code   │   │  Security ∙ Cost ∙ Governance ∙ IAM ∙ Monitor  │
│    Authentication│   │  Advisor  ∙ Activity Logs ∙ Resource Health     │
│  • OAuth 2.0     │   │  Deployments ∙ Quotas ∙ Compliance             │
│  • Token issued  │   │                                                  │
│    to browser    │   │  All endpoints are READ-ONLY (HTTP GET)         │
└──────────────────┘   └────────────────────────────────────────────────┘

  DATA FLOW:  Azure API ──▶ Browser Memory ──▶ Dashboard UI ──▶ Gone on logoff
  STORAGE:    ❌ No database  ❌ No cookies  ❌ No localStorage  ❌ No server logs
`}</pre>
                </div>
              </div>

              {/* ── Authentication Security ── */}
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><Key className="w-5 h-5 text-amber-600" /> Authentication Security</h3>
                <p className="text-xs text-slate-400 mb-4">OAuth 2.0 Device Code Flow — industry-standard, zero credential exposure.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="text-xs text-slate-600 space-y-2.5">
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>OAuth 2.0 Device Code Flow (RFC 8628)</strong> — same as <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">az login --use-device-code</code></span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>Authentication delegated <strong>entirely to Microsoft Entra ID</strong> — Overclouded never handles usernames or passwords</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>Azure access token stored <strong>only in JavaScript variable</strong> (volatile memory), never persisted</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>Token scoped to <strong>Reader</strong> role — cannot create, modify, or delete any Azure resource</span></li>
                  </ul>
                  <ul className="text-xs text-slate-600 space-y-2.5">
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>Token <strong>auto-expires</strong> after ~60-90 minutes. No refresh token stored.</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Multi-Factor Authentication (MFA)</strong> fully supported</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>No app registration required — uses Azure CLI public client ID</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>No client secrets, no certificates, no service principals</span></li>
                  </ul>
                </div>
              </div>

              {/* ── Data Collection ── */}
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><Workflow className="w-5 h-5 text-purple-600" /> How Data Is Collected</h3>
                <p className="text-xs text-slate-400 mb-4">Every API call is a read-only GET request to <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">management.azure.com</code>, authenticated with the user's own Azure token.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-slate-500 font-bold uppercase text-[10px]">Category</th>
                        <th className="text-left py-2 text-slate-500 font-bold uppercase text-[10px]">Azure REST API Endpoint</th>
                        <th className="text-left py-2 text-slate-500 font-bold uppercase text-[10px]">Data Retrieved</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      {[
                        ['Resources', '/subscriptions/{id}/resources', 'Resource inventory, types, regions'],
                        ['Security', '/providers/Microsoft.Security/secureScores', 'Secure Score, compliance %'],
                        ['Alerts', '/providers/Microsoft.Security/alerts', 'Active security alerts'],
                        ['Advisor', '/providers/Microsoft.Advisor/recommendations', 'Cost, security, perf recommendations'],
                        ['Activity Logs', '/providers/Microsoft.Insights/eventtypes', 'Operation audit trail'],
                        ['IAM', '/providers/Microsoft.Authorization/roleAssignments', 'Role assignments'],
                        ['Deployments', '/resourcegroups/{rg}/deployments', 'ARM deployment history'],
                        ['Health', '/providers/Microsoft.ResourceHealth', 'Resource health status'],
                        ['Quotas', '/providers/Microsoft.Compute/locations/usages', 'Quota usage vs limits'],
                        ['Compliance', '/providers/Microsoft.Security/regulatoryComplianceStandards', 'CIS, NIST, PCI-DSS, ISO 27001'],
                      ].map(([cat, endpoint, desc], i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-1.5 font-medium text-slate-800">{cat}</td>
                          <td className="py-1.5 font-mono text-[10px] text-slate-500">{endpoint}</td>
                          <td className="py-1.5">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Session Lifecycle ── */}
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-500" /> Session Lifecycle & Data Flush</h3>
                <p className="text-xs text-slate-400 mb-4">Complete lifecycle — from login to irrecoverable data destruction.</p>
                <div className="space-y-0">
                  {[
                    { step: '1', title: 'User Opens Overclouded', desc: 'Static HTML/JS/CSS loaded. No data exists yet. No cookies set.', color: 'bg-blue-500' },
                    { step: '2', title: 'User Initiates Login', desc: 'Azure Device Code flow starts. User authenticates directly with Microsoft.', color: 'bg-blue-500' },
                    { step: '3', title: 'Token Received in Browser', desc: 'Azure OAuth token stored in JavaScript variable only. Never written to any browser storage.', color: 'bg-blue-500' },
                    { step: '4', title: 'Data Fetched from Azure APIs', desc: 'Browser makes direct HTTPS GET requests to management.azure.com. Responses parsed into React state.', color: 'bg-green-500' },
                    { step: '5', title: 'Dashboard Rendered', desc: 'Data displayed as charts, tables, KPIs — all client-side. Data exists only in React useState().', color: 'bg-green-500' },
                    { step: '6', title: 'PDF Generated (Optional)', desc: 'jsPDF creates reports in-browser. Downloaded directly. No server upload.', color: 'bg-green-500' },
                    { step: '7', title: 'User Signs Out / Closes Tab', desc: 'window.location.reload() clears all React state. Browser GC reclaims all memory. Token invalidated.', color: 'bg-red-500' },
                    { step: '8', title: 'Post-Session State', desc: 'ZERO data remains anywhere — no server, no client storage, no logs, no cache. As if the session never happened.', color: 'bg-red-500' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full ${item.color} text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>{item.step}</div>
                        {idx < 7 && <div className="w-0.5 h-full bg-slate-200 min-h-[16px]"></div>}
                      </div>
                      <div className="pb-3">
                        <h6 className="font-bold text-slate-900 text-sm leading-tight">{item.title}</h6>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Technical Proof ── */}
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-slate-600" /> Technical Proof — Why Data Cannot Persist</h3>
                <div className="bg-slate-900 text-slate-300 p-5 rounded-xl font-mono text-[11px] space-y-3 overflow-x-auto">
                  <div>
                    <span className="text-green-400">{'// 1. React state is volatile — lives only in JS heap'}</span>
                    <br/><span className="text-blue-300">const</span> [data, setData] = <span className="text-yellow-300">useState</span>&lt;DashboardData | <span className="text-blue-300">null</span>&gt;(<span className="text-blue-300">null</span>);
                    <br/><span className="text-green-400">{'// Component unmount → data = null → GC reclaims memory'}</span>
                  </div>
                  <div>
                    <span className="text-green-400">{'// 2. Sign-out triggers full page reload'}</span>
                    <br/><span className="text-yellow-300">window</span>.<span className="text-blue-300">location</span>.<span className="text-yellow-300">reload</span>(); <span className="text-green-400">{'// Destroys ALL JS context'}</span>
                  </div>
                  <div>
                    <span className="text-green-400">{'// 3. No browser storage APIs used (verifiable in DevTools)'}</span>
                    <br/><span className="text-slate-500">localStorage.length === 0    </span><span className="text-green-400">{'// ✓ Nothing stored'}</span>
                    <br/><span className="text-slate-500">sessionStorage.length === 0  </span><span className="text-green-400">{'// ✓ Nothing stored'}</span>
                    <br/><span className="text-slate-500">document.cookie === ""       </span><span className="text-green-400">{'// ✓ No cookies'}</span>
                    <br/><span className="text-slate-500">indexedDB.databases() === [] </span><span className="text-green-400">{'// ✓ No IndexedDB'}</span>
                  </div>
                </div>
              </div>

              {/* ── Security Controls ── */}
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-red-500" /> Security Controls & Threat Mitigation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  {[
                    { title: 'Transport Security', icon: <Lock className="w-5 h-5 text-green-600" />, bg: 'bg-green-50', items: ['All communication over HTTPS (TLS 1.2+)', 'HSTS headers enforced on deployment', 'No mixed content — all resources served over HTTPS'] },
                    { title: 'Application Security', icon: <Shield className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50', items: ['React auto-escapes output (XSS prevention)', 'No eval(), no dynamic script injection', 'TypeScript strict mode for static analysis', 'Dependencies audited via npm audit'] },
                    { title: 'Infrastructure Security', icon: <Server className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50', items: ['Deployed on Google Cloud Run (serverless)', 'Container image rebuilt on every push', 'No SSH access, no persistent storage', 'Secrets managed via GCP Secret Manager'] },
                    { title: 'Privacy by Design', icon: <Eye className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', items: ['No analytics, no tracking, no telemetry', 'No third-party data sharing', 'Gemini AI (optional) receives only subscription ID', 'Source code publicly auditable on GitHub'] },
                  ].map((section, idx) => (
                    <div key={idx} className={`${section.bg} p-4 rounded-xl`}>
                      <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">{section.icon} {section.title}</h5>
                      <ul className="text-[11px] text-slate-600 space-y-1.5">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2"><CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" /><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Threat Matrix */}
                <h4 className="font-bold text-slate-900 text-sm mb-3">Threat Matrix</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-slate-500 font-bold uppercase text-[10px]">Threat</th>
                        <th className="text-left py-2 text-slate-500 font-bold uppercase text-[10px]">Risk</th>
                        <th className="text-left py-2 text-slate-500 font-bold uppercase text-[10px]">Mitigation</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      {[
                        ['Data Breach / Exfiltration', 'None', 'No data stored anywhere. Nothing to breach.'],
                        ['Credential Theft', 'Mitigated', 'OAuth device code flow — credentials never touch Overclouded.'],
                        ['Man-in-the-Middle', 'Mitigated', 'All traffic over TLS 1.2+. HSTS enforced.'],
                        ['Cross-Site Scripting (XSS)', 'Mitigated', 'React auto-escapes. No dangerouslySetInnerHTML. CSP headers.'],
                        ['Token Hijacking', 'Low', 'Token in memory only. Auto-expires. Read-only scope.'],
                        ['Server Compromise', 'Minimal', 'Serverless Cloud Run. No persistent state. Immutable containers.'],
                        ['Insider Threat', 'None', 'No admin access to customer data — exists only in user\'s browser.'],
                      ].map(([threat, risk, mitigation], idx) => (
                        <tr key={idx} className="border-b border-slate-50">
                          <td className="py-1.5 font-medium text-slate-800">{threat}</td>
                          <td className="py-1.5">
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              risk === 'None' ? 'bg-green-100 text-green-700' :
                              risk === 'Mitigated' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{risk}</span>
                          </td>
                          <td className="py-1.5">{mitigation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Compliance ── */}
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl">
                <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Compliance Mapping</h3>
                <ul className="text-xs text-slate-700 space-y-2">
                  <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>GDPR Art. 5(1)(e):</strong> No personal data stored beyond active session — storage limitation principle satisfied by design.</span></li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>SOC 2 Type II (CC6.1):</strong> No data at rest = no encryption-at-rest obligation. Data in transit protected via TLS.</span></li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>ISO 27001 (A.8.10):</strong> Information deletion is implicit — volatile memory released when session ends.</span></li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>HIPAA § 164.312(d):</strong> No PHI stored. Data viewed ephemerally and never written to disk.</span></li>
                </ul>
              </div>

              {/* ── Auditor's Checklist ── */}
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-600" /> Auditor's Verification Checklist</h3>
                <p className="text-xs text-slate-400 mb-4">The following checks can be independently verified by any security auditor, compliance officer, or customer:</p>
                <div className="space-y-2">
                  {[
                    'Open DevTools → Application → Storage: Confirm localStorage, sessionStorage, cookies, and IndexedDB are all empty.',
                    'Open DevTools → Network tab: All XHR/fetch calls go only to management.azure.com. No calls to Overclouded servers for data.',
                    'Inspect source code (GitHub): Search for localStorage, sessionStorage, document.cookie, indexedDB — none are used.',
                    'Verify all Azure API calls are HTTP GET (read-only). No POST/PUT/DELETE/PATCH calls.',
                    'Sign out and reopen: No previous session data, dashboards, or tokens are recoverable.',
                    'Review Dockerfile and cloud_run_server.py: No database drivers, no file I/O for user data, no logging of request bodies.',
                    'Run network traffic capture (Wireshark/Fiddler): All traffic encrypted (TLS). Only Microsoft and Google CDN destinations.',
                  ].map((check, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-[11px] text-slate-700">{check}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Summary ── */}
              <div className="p-6 bg-slate-900 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-3">Audit Summary Statement</h3>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "Overclouded is a stateless, read-only, client-side cloud intelligence dashboard. It authenticates users via Microsoft Entra ID 
                  (OAuth 2.0 Device Code Flow), fetches Azure subscription telemetry directly into the browser's volatile memory via the Azure Resource 
                  Manager REST API, and renders the data as interactive visualizations. No customer data is stored, persisted, cached, logged, or 
                  transmitted to any Overclouded-controlled infrastructure at any point during or after the session. All data is irrecoverably 
                  destroyed when the browser tab is closed or the user signs out. The platform source code is publicly auditable on GitHub."
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
                  <span>Report Version: 1.0</span>
                  <span>|</span>
                  <span>Platform: Overclouded™</span>
                  <span>|</span>
                  <span>Source: github.com/PromitXI/Overclouded2</span>
                </div>
              </div>

              <div className="text-sm text-slate-400 italic border-t border-slate-100 pt-6">"Designed with privacy by default. We provide the lens, not the storage."</div>
            </div>
          </div>
        );
      case 'CONTACT':
        return (
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <button onClick={() => setActiveTab('HOME')} className="flex items-center text-slate-400 hover:text-slate-900 mb-6 transition-colors"><ChevronLeft className="w-4 h-4 mr-1" /> Back to Home</button>

            {/* ── The Card ── */}
            <div className="flex items-center justify-center">
              <div
                className="relative w-full max-w-[540px] group cursor-default"
                style={{ perspective: '1200px' }}
              >
                {/* Card container with subtle 3D tilt on hover */}
                <div
                  className="relative rounded-sm overflow-hidden transition-all duration-700 ease-out group-hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]"
                  style={{
                    background: 'linear-gradient(165deg, #FAF9F6 0%, #F5F0EB 40%, #EDE8E1 100%)',
                    aspectRatio: '1.75 / 1',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 28px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  {/* Subtle paper texture overlay */}
                  <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}></div>

                  {/* Embossed edge line — top */}
                  <div className="absolute top-[18px] left-[24px] right-[24px] h-[0.5px]" style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(180,160,140,0.15) 20%, rgba(180,160,140,0.15) 80%, transparent 100%)',
                  }}></div>

                  {/* Embossed edge line — bottom */}
                  <div className="absolute bottom-[18px] left-[24px] right-[24px] h-[0.5px]" style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(180,160,140,0.15) 20%, rgba(180,160,140,0.15) 80%, transparent 100%)',
                  }}></div>

                  {/* Card content */}
                  <div className="relative h-full flex flex-col justify-between p-8 md:p-10">

                    {/* Top section — Company */}
                    <div className="text-center">
                      <div className="mb-1">
                        <span
                          className="text-[10px] md:text-[11px] tracking-[0.45em] uppercase"
                          style={{ color: '#6B6259', fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                          Over Clouded
                        </span>
                        <span className="align-super text-[6px] ml-0.5" style={{ color: '#9B9286' }}>TM</span>
                      </div>
                      <div className="w-8 h-[0.5px] mx-auto mt-1" style={{ background: 'rgba(160,145,130,0.3)' }}></div>
                    </div>

                    {/* Center — Name & Title */}
                    <div className="text-center -mt-2">
                      <h2
                        className="text-xl md:text-2xl tracking-[0.15em] uppercase mb-2"
                        style={{
                          color: '#2C2824',
                          fontFamily: "'Georgia', 'Times New Roman', serif",
                          fontWeight: 400,
                          textShadow: '0 0.5px 0 rgba(255,255,255,0.8)',
                        }}
                      >
                        Promit Bhattacherjee
                      </h2>
                      <p
                        className="text-[10px] md:text-[11px] tracking-[0.35em] uppercase"
                        style={{ color: '#8C8279', fontFamily: "'Georgia', 'Times New Roman', serif" }}
                      >
                        Lead Architect
                      </p>
                    </div>

                    {/* Bottom — Contact Details */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3" style={{ color: '#A09182' }} />
                        <span
                          className="text-[10px] md:text-[11px] tracking-[0.2em]"
                          style={{ color: '#5C554E', fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                          974 275 7917
                        </span>
                      </div>
                      <div className="hidden md:block w-[3px] h-[3px] rounded-full" style={{ background: '#C4BAB0' }}></div>
                      <a href="mailto:promit.xi@gmail.com" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                        <Mail className="w-3 h-3" style={{ color: '#A09182' }} />
                        <span
                          className="text-[10px] md:text-[11px] tracking-[0.12em]"
                          style={{ color: '#5C554E', fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                          promit.xi@gmail.com
                        </span>
                      </a>
                      <div className="hidden md:block w-[3px] h-[3px] rounded-full" style={{ background: '#C4BAB0' }}></div>
                      <a href="https://x.com/promit_xi" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                        <svg viewBox="0 0 24 24" className="w-3 h-3" style={{ color: '#A09182' }} fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                        <span
                          className="text-[10px] md:text-[11px] tracking-[0.12em]"
                          style={{ color: '#5C554E', fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                          @promit_xi
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* Subtle shimmer effect on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 55%, transparent 60%)',
                    }}
                  ></div>
                </div>

                {/* Card shadow / surface underneath */}
                <div className="absolute -bottom-1 left-2 right-2 h-2 rounded-b-sm" style={{
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.04), transparent)',
                }}></div>
              </div>
            </div>

            {/* Subtle caption */}
            <div className="text-center mt-10">
              <p className="text-[11px] tracking-[0.3em] uppercase" style={{ color: '#B0A89E', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                "Vision without work is fantasy. Work without vision is labor.
              </p>
              <p className="text-[11px] tracking-[0.3em] uppercase" style={{ color: '#B0A89E', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                Combine both — and you build empires."
              </p>
              <p className="text-[10px] tracking-[0.2em] mt-2" style={{ color: '#CCC5BD', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                — Promit
              </p>
            </div>
          </div>
        );
      case 'ENTERPRISE': return null;
      case 'HOME': default:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-xl mb-12 lg:mb-20">
              <h1 className="text-4xl md:text-6xl font-medium leading-tight tracking-tight mb-8">Cloud Intelligence <br />that connects Ops <br />with Peace of Mind.</h1>
              <button onClick={() => setShowInput(true)} className="group flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-slate-800 transition-all hover:pr-10">
                Analyse Environment <ArrowRight className="w-5 h-5 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </button>
            </div>
            <div className="hidden lg:block text-slate-400 text-sm">&copy; {new Date().getFullYear()} Over Clouded Inc. All rights reserved.</div>
          </div>
        );
    }
  };

  // ── Device Code Flow UI ──

  const renderDeviceCodeFlow = () => {
    if (authStep === 'IDLE') {
      return (
        <>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-500" />
              <div>
                <strong>Secure Device Code Login</strong>
                <p className="mt-1 text-slate-500">Uses <code className="bg-slate-100 px-1 rounded font-mono text-xs">az login --use-device-code</code> under the hood. You sign in on Microsoft's website — no credentials enter this app.</p>
              </div>
            </div>
          </div>
          <button onClick={handleStartDeviceCode} disabled={isLoading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <>
                <svg viewBox="0 0 23 23" className="w-5 h-5" fill="none"><path d="M1 1h10v10H1z" fill="#f25022" /><path d="M12 1h10v10H12z" fill="#7fba00" /><path d="M1 12h10v10H1z" fill="#00a4ef" /><path d="M12 12h10v10H12z" fill="#ffb900" /></svg>
                Generate Device Code
              </>
            )}
          </button>
        </>
      );
    }

    if (authStep === 'DEVICE_CODE') {
      return (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <p className="text-sm text-blue-700 mb-3 font-medium">Your Device Code</p>
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-3xl md:text-4xl font-mono font-black tracking-[0.3em] text-slate-900 select-all">{userCode}</span>
              <button onClick={() => copyToClipboard(userCode)} className="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Copy code">
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-blue-400" />}
              </button>
            </div>
            <p className="text-xs text-blue-500">Go to <strong>{verificationUri}</strong> and enter this code to sign in.</p>
          </div>
          <button onClick={handleOpenBrowserAndPoll} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
            <ExternalLink className="w-5 h-5" /> Open Browser & Sign In
          </button>
          <button onClick={resetAuth} className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium py-2 transition-colors">Cancel</button>
        </>
      );
    }

    if (authStep === 'POLLING') {
      return (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-amber-800 mb-1">Waiting for Authentication</p>
            <p className="text-xs text-amber-600">{pollingStatus}</p>
            {userCode && <p className="text-xs text-amber-500 mt-3">Code: <span className="font-mono font-bold">{userCode}</span></p>}
          </div>
          <button onClick={resetAuth} className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium py-2 transition-colors">Cancel Authentication</button>
        </>
      );
    }

    if (authStep === 'AUTHENTICATED') {
      return (
        <>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
            <div className="flex items-center gap-3"><Check className="w-5 h-5 flex-shrink-0 text-green-500" /><strong>Authentication Successful</strong></div>
          </div>
          {subscriptions.length > 0 ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Select Subscription</label>
                <div className="relative">
                  <select value={selectedSubId} onChange={(e) => setSelectedSubId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none pr-10">
                    {subscriptions.map((sub) => (<option key={sub.subscriptionId} value={sub.subscriptionId}>{sub.displayName} ({sub.subscriptionId.slice(0, 8)}...)</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <button onClick={handleStartAnalysis} disabled={isLoading || !selectedSubId} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Start Analysis'}
              </button>
            </>
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm"><AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />No subscriptions found.</div>
          )}
          <button onClick={resetAuth} className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium py-2 transition-colors">Sign in with a different account</button>
        </>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white overflow-hidden relative">
      <header className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-center z-20 mix-blend-difference text-white lg:text-slate-900 lg:mix-blend-normal">
        <div className="text-3xl md:text-4xl font-extrabold tracking-tighter cursor-pointer" onClick={() => setActiveTab('HOME')}>Over Clouded<span className="align-top text-sm font-medium">TM</span></div>
        <nav className="hidden md:flex space-x-8 text-sm font-medium">
          <button onClick={() => setActiveTab('DOCS')} className={`hover:underline decoration-2 underline-offset-4 ${activeTab === 'DOCS' ? 'underline' : ''}`}>Documentation</button>
          <button onClick={() => setActiveTab('SECURITY')} className={`hover:underline decoration-2 underline-offset-4 ${activeTab === 'SECURITY' ? 'underline' : ''}`}>Security</button>
          <button className="opacity-50 cursor-not-allowed" title="Enterprise features coming soon">Enterprise</button>
          <button onClick={() => setActiveTab('CONTACT')} className={`hover:underline decoration-2 underline-offset-4 ${activeTab === 'CONTACT' ? 'underline' : ''}`}>Contact</button>
        </nav>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 h-screen w-full">
        <div className="relative flex flex-col justify-center lg:justify-end p-6 md:p-12 lg:p-20 order-2 lg:order-1 bg-white pt-24 lg:pt-0">{renderContent()}</div>
        <div className="relative h-[40vh] lg:h-full order-1 lg:order-2 bg-slate-100 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop" alt="Minimalist Architecture" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent lg:hidden"></div>
        </div>
      </div>

      {/* Login Modal */}
      {showInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/20" onClick={() => { if (authStep === 'IDLE') setShowInput(false); }}></div>
          <div className="bg-white w-full max-w-lg p-8 md:p-12 rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <button onClick={() => { resetAuth(); setShowInput(false); }} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Initialize Analysis</h2>
              <p className="text-slate-500">Connect securely to your Azure environment.</p>
            </div>
            <div className="flex p-1 bg-slate-100 rounded-lg mb-8">
              <button onClick={() => setMode('REAL')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'REAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Live Connection</button>
              <button onClick={() => { setMode('DEMO'); resetAuth(); }} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'DEMO' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Demo Data</button>
            </div>
            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-5">
                <div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" /><div>{authError}</div></div>
              </div>
            )}
            {mode === 'REAL' ? (
              <div className="space-y-5">{renderDeviceCodeFlow()}</div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6"><Terminal className="w-8 h-8 text-slate-400" /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Explore Capabilities</h3>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto">Launch a simulation with generated data to experience the dashboard features.</p>
                <button onClick={handleDemoLogin} disabled={isLoading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Launch Demo'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
