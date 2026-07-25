import React, { useState, useCallback } from 'react';
import { ArrowRight, X, Loader2, Terminal, AlertCircle, ShieldCheck, Mail, Phone, Lock, ChevronLeft, ChevronDown, Check, ExternalLink, Server, Trash2, Eye, Database, Key, Shield, CheckCircle, FileText, Workflow, DollarSign, Lightbulb, Users, Activity } from 'lucide-react';
import { signIn, signOut, getArmToken, fetchSubscriptions, isAuthConfigured, AzureSubscription, SignedInUser } from '../services/authService';

interface LoginScreenProps {
  onLogin: (subId: string, token?: string) => void;
}

type TabState = 'HOME' | 'DOCS' | 'SECURITY' | 'CONTACT';
type AuthStep = 'IDLE' | 'SIGNING_IN' | 'AUTHENTICATED';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<TabState>('HOME');
  const [showInput, setShowInput] = useState(false);
  const [mode, setMode] = useState<'DEMO' | 'REAL'>('REAL');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [authStep, setAuthStep] = useState<AuthStep>('IDLE');
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [subscriptions, setSubscriptions] = useState<AzureSubscription[]>([]);
  const [selectedSubId, setSelectedSubId] = useState('');

  const resetAuth = useCallback(() => {
    void signOut();
    setAuthStep('IDLE');
    setUser(null);
    setSubscriptions([]);
    setSelectedSubId('');
    setAuthError(null);
  }, []);

  /**
   * Sign in, then immediately list subscriptions — the token is only held for
   * the duration of these two calls and is re-acquired when the scan starts.
   */
  const handleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    setAuthStep('SIGNING_IN');
    try {
      const signedIn = await signIn();
      setUser(signedIn);

      const token = await getArmToken();
      const subs = await fetchSubscriptions(token);
      setSubscriptions(subs);
      if (subs.length > 0) setSelectedSubId(subs[0].subscriptionId);
      setAuthStep('AUTHENTICATED');
    } catch (err: any) {
      setAuthError(err?.message || 'Sign-in failed.');
      setAuthStep('IDLE');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedSubId) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      // Acquire a fresh token so a long-running modal cannot hand the
      // dashboard something that has already expired.
      const token = await getArmToken();
      onLogin(selectedSubId, token);
    } catch (err: any) {
      setAuthError(err?.message || 'Could not get an access token.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDemoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      onLogin('demo-subscription-id');
      setIsLoading(false);
    }, 1000);
  };

  // ── Content sections ──

  const isHome = activeTab === 'HOME';

  const renderContent = () => {
    switch (activeTab) {
      case 'DOCS':
        return (
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <button onClick={() => setActiveTab('HOME')} className="flex items-center text-slate-400 hover:text-slate-900 mb-6 transition-colors">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Home
            </button>
            <h2 className="text-3xl font-bold mb-6">Connection Documentation</h2>
            <div className="space-y-8 max-w-3xl">
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-600" />
                  Step 1: Click "Analyse Environment"
                </h3>
                <p className="text-slate-500 text-sm mb-3">Choose "Live Connection", then "Sign in with Microsoft". A Microsoft sign-in window opens — nothing is typed into Overclouded itself.</p>
              </section>
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Step 2: Approve the read-only access</h3>
                <p className="text-slate-500 text-sm mb-3">Sign in as you normally would, including MFA. The consent screen shows Overclouded requesting delegated read access to Azure Resource Manager. On first use in a tenant, a Global Administrator may need to grant consent once.</p>
              </section>
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Step 3: Select a Subscription</h3>
                <p className="text-slate-500 text-sm mb-3">Overclouded lists the subscriptions your account can read. Pick one and click "Start Analysis".</p>
              </section>
              <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Prerequisites</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm text-blue-700">
                  <li>Your account needs at least the <strong>Reader</strong> role on the target subscription.</li>
                  <li>Popups must be allowed for this site — sign-in happens in a popup window.</li>
                  <li><strong>No Azure CLI, no agent, and nothing to install.</strong> Authentication runs entirely in the browser.</li>
                </ul>
              </section>
              <section className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                <h3 className="text-lg font-bold text-orange-800 mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Troubleshooting</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm text-orange-700">
                  <li><strong>Popup blocked?</strong> Allow popups for this site and click sign in again.</li>
                  <li><strong>"Needs admin approval"?</strong> Your tenant requires a Global Administrator to consent to the app once, after which everyone can sign in.</li>
                  <li><strong>No subscriptions listed?</strong> The account signed in successfully but holds no role on any subscription. Ask for Reader access.</li>
                  <li><strong>Signed out after refreshing?</strong> Expected — tokens live in memory only and are deliberately not persisted.</li>
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
            <div className="space-y-6">

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
│  │ Auth Code +  │              │                                      │
│  │ Flow         │              │  Azure data stays in browser memory  │
│  └──────┬───────┘              │                                      │
└─────────┼──────────────────────┼──────────────────────────────────────┘
          │                      │
          ▼                      ▼
┌──────────────────┐   ┌────────────────────────────────────────────────┐
│  Microsoft Entra │   │       Azure Resource Manager API               │
│  ID (Azure AD)   │   │       https://management.azure.com             │
│                  │   │                                                  │
│  • Auth Code +   │   │  Security ∙ Cost ∙ Governance ∙ IAM ∙ Monitor  │
│    Authentication│   │  Advisor  ∙ Activity Logs ∙ Resource Health     │
│  • OAuth 2.0     │   │  Deployments ∙ Quotas ∙ Compliance             │
│  • Token issued  │   │                                                  │
│    to browser    │   │  All endpoints are READ-ONLY (HTTP GET)         │
└──────────────────┘   └────────────────────────────────────────────────┘

  DATA FLOW:  Azure API ──▶ Browser Memory ──▶ Dashboard UI ──▶ Gone on logoff
  STORAGE:    ❌ No database  ❌ No cookies  ❌ No localStorage
`}</pre>
                </div>
              </div>

              {/* ── Authentication Security ── */}
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><Key className="w-5 h-5 text-amber-600" /> Authentication Security</h3>
                <p className="text-xs text-slate-400 mb-4">OAuth 2.0 authorization code flow with PKCE — industry-standard, zero credential exposure.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="text-xs text-slate-600 space-y-2.5">
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Authorization code flow with PKCE (RFC 7636)</strong> via the Microsoft Authentication Library (MSAL)</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>Authentication delegated <strong>entirely to Microsoft Entra ID</strong> — Overclouded never handles usernames or passwords</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>MSAL configured with <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">cacheLocation: memoryStorage</code> — tokens are <strong>never</strong> written to localStorage or sessionStorage</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>Token requested with the delegated <strong>user_impersonation</strong> scope and constrained by the signed-in user's own Azure RBAC</span></li>
                  </ul>
                  <ul className="text-xs text-slate-600 space-y-2.5">
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>The token <strong>never reaches an Overclouded server</strong> — the browser calls Azure directly</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>Token <strong>auto-expires</strong> after ~60–90 minutes, and a page reload requires signing in again</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Multi-Factor Authentication</strong> and Conditional Access policies are fully honoured</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" /><span>Public client — <strong>no client secrets</strong>, no certificates, no service principals</span></li>
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
                    { step: '2', title: 'User Initiates Login', desc: 'MSAL starts the authorization code + PKCE flow. User authenticates directly with Microsoft.', color: 'bg-blue-500' },
                    { step: '3', title: 'Token Received in Browser', desc: 'Azure OAuth token stored in JavaScript variable only. Never written to any browser storage.', color: 'bg-blue-500' },
                    { step: '4', title: 'Data Fetched from Azure APIs', desc: 'Browser makes direct HTTPS GET requests to management.azure.com. Responses parsed into React state.', color: 'bg-green-500' },
                    { step: '5', title: 'Dashboard Rendered', desc: 'Data displayed as charts, tables, KPIs — all client-side. Data exists only in React useState().', color: 'bg-green-500' },
                    { step: '6', title: 'PDF Generated (Optional)', desc: 'jsPDF creates reports in-browser. Downloaded directly. No server upload.', color: 'bg-green-500' },
                    { step: '7', title: 'User Signs Out / Closes Tab', desc: 'window.location.reload() clears all React state. Browser GC reclaims all memory. Token invalidated.', color: 'bg-red-500' },
                    { step: '8', title: 'Post-Session State', desc: 'Dashboard data is not persisted. The isolated Azure CLI token cache is temporary and removed with the server session or instance.', color: 'bg-red-500' },
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
                        ['Credential Theft', 'Mitigated', 'OAuth authorization code + PKCE — credentials never touch Overclouded.'],
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
                    'Open DevTools → Network tab: Azure assessment data is fetched from management.azure.com; /api calls are limited to authentication and optional demo generation.',
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
                  "Overclouded is a read-only cloud intelligence dashboard. It uses an isolated Azure CLI device-code session for authentication,
                  fetches subscription telemetry from Azure Resource Manager into browser memory, and does not persist assessment data in a database
                  or browser storage. Authentication token caches are isolated per server session and temporary. The platform source code is publicly auditable on GitHub."
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
            <h2 className="text-3xl font-bold mb-2">Talk to us</h2>
            <p className="text-slate-500 mb-8 max-w-lg">
              Book a walkthrough against your own subscription, or ask us anything about how the
              analysis works. We usually reply the same working day.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mb-8">
              <a
                href="mailto:promit.xi@gmail.com?subject=Overclouded%20—%20request%20a%20demo"
                className="group flex items-center gap-4 p-5 rounded-2xl border border-slate-200 hover:border-slate-900 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">Book a demo</div>
                  <div className="text-sm text-slate-500 truncate">promit.xi@gmail.com</div>
                </div>
              </a>

              <a
                href="tel:+9742757917"
                className="group flex items-center gap-4 p-5 rounded-2xl border border-slate-200 hover:border-slate-900 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">Sales &amp; support</div>
                  <div className="text-sm text-slate-500">974 275 7917</div>
                </div>
              </a>
            </div>

            <div className="max-w-2xl p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 text-sm mb-1">Evaluating with your own data?</div>
                  <p className="text-sm text-slate-500">
                    You do not need to send us anything. Overclouded reads your subscription directly
                    from your browser using your own Microsoft sign-in, and retains nothing after the
                    session ends. See <button onClick={() => setActiveTab('SECURITY')} className="text-slate-900 font-medium underline underline-offset-2">Security</button> for the full audit trail.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 max-w-2xl flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
              <span>Promit Bhattacherjee &middot; Lead Architect</span>
              <a href="https://x.com/promit_xi" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">@promit_xi</a>
            </div>
          </div>
        );
      case 'HOME': default:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl xl:text-6xl font-medium leading-tight tracking-tight mb-6">Cloud Intelligence <br />that connects Ops <br />with Peace of Mind.</h1>
              <p className="text-lg text-slate-500 mb-8 max-w-md">
                Point Overclouded at an Azure subscription and get a full read on cost, security,
                governance and identity — plus a board-ready report — in about a minute.
              </p>
              <button onClick={() => setShowInput(true)} className="group flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-slate-800 transition-all hover:pr-10">
                Analyse Environment <ArrowRight className="w-5 h-5 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </button>
              <div className="flex items-center gap-2 mt-5 text-sm text-slate-400">
                <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Read-only. You sign in on Microsoft&apos;s own page — no credentials, no agents, nothing stored.</span>
              </div>
            </div>
          </div>
        );
    }
  };

  // ── Landing page content below the hero ──

  const CAPABILITIES = [
    { icon: DollarSign, title: 'Cost Analysis', body: 'Month-to-date spend, month-end forecast against budget, and a breakdown by service, resource group and region.' },
    { icon: Lightbulb, title: 'Savings Advisor', body: 'Rightsizing and reservation opportunities with the monthly dollar figure attached to each one.' },
    { icon: Shield, title: 'Security Posture', body: 'Defender secure score, active threats, open NSG rules, encryption gaps and expiring Key Vault material.' },
    { icon: FileText, title: 'Compliance Coverage', body: 'Control-level pass rates for CIS, ISO 27001, PCI DSS and NIST SP 800-53.' },
    { icon: Users, title: 'Identity & Access', body: 'Every role assignment, who holds Owner, service principal credential expiry and accounts gone stale.' },
    { icon: Activity, title: 'Operations & SLA', body: 'CPU, memory and IOPS trends, resource health, backup coverage and SLA attainment against contract.' },
  ];

  const renderMarketing = () => (
    <div className="bg-white">
      {/* What it does */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-16">
            <div className="text-xs font-bold tracking-[0.2em] uppercase text-slate-400 mb-4">What you get</div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-5">
              The answers your cloud bill and your auditor both want.
            </h2>
            <p className="text-lg text-slate-500">
              Azure already holds this data — spread across Cost Management, Defender for Cloud,
              Advisor, Policy and Entra ID. Overclouded reads all of it in one pass and returns a
              single prioritised picture, ranked by severity and dollar impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <div className="text-xs font-bold tracking-[0.2em] uppercase text-slate-400 mb-4">The deliverable</div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-5">
              A report you can hand to the client.
            </h2>
            <p className="text-lg text-slate-500 mb-8">
              One click exports a nine-page PDF: executive summary with posture scores and a spend
              forecast against budget pace, then cost, savings, security, governance, operations,
              identity, change history and the methodology behind every number.
            </p>
            <button onClick={() => setShowInput(true)} className="group flex items-center gap-3 bg-slate-900 text-white px-7 py-3.5 rounded-full font-medium hover:bg-slate-800 transition-all">
              See it on your own data <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['9', 'pages, every one populated'],
              ['30+', 'charts, tables and gauges'],
              ['11', 'Azure APIs read per scan'],
              ['0', 'bytes retained afterwards'],
            ].map(([stat, label]) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="text-3xl font-semibold text-slate-900 mb-1">{stat}</div>
                <div className="text-sm text-slate-500 leading-snug">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-14">
            <div className="text-xs font-bold tracking-[0.2em] uppercase text-slate-400 mb-4">Why security teams allow it</div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight">
              Nothing to install. Nothing to hand over.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Lock, title: 'Your sign-in, not ours', body: 'Authentication runs through Microsoft Entra ID using OAuth 2.0 with PKCE. Credentials are entered on Microsoft’s page and never reach this application.' },
              { icon: Eye, title: 'Read-only by construction', body: 'Every Azure call is a GET against management.azure.com under your own permissions. Overclouded cannot create, modify or delete a resource.' },
              { icon: Trash2, title: 'Zero retention', body: 'Results live in browser memory for the session and are destroyed when the tab closes. No database, no cookies, no local storage.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="p-7 rounded-2xl border border-slate-200">
                <Icon className="w-5 h-5 text-slate-900 mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setActiveTab('SECURITY')} className="mt-8 text-sm font-medium text-slate-900 underline underline-offset-4 hover:text-slate-600 transition-colors">
            Read the full security architecture
          </button>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-6">
            Scan a subscription in about a minute.
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
            Run it live against your own Azure environment, or explore the full dashboard with
            demonstration data first.
          </p>
          <button onClick={() => setShowInput(true)} className="group inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-full text-lg font-medium hover:bg-slate-100 transition-all">
            Analyse Environment <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="mt-14 pt-8 border-t border-white/10 text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Overclouded Inc. All rights reserved.
          </div>
        </div>
      </section>
    </div>
  );

  // ── Sign-in UI ──

  const renderSignIn = () => {
    if (!isAuthConfigured()) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
            <div>
              <strong className="block mb-1">Microsoft sign-in is not configured</strong>
              <p className="text-amber-700">
                Set <code className="bg-amber-100 px-1 rounded font-mono text-xs">VITE_AZURE_CLIENT_ID</code> to
                your Entra app registration client ID and restart the dev server. The README covers the
                one-time setup. Demo Data works without it.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (authStep === 'AUTHENTICATED') {
      return (
        <>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 flex-shrink-0 text-green-600" />
              <div className="min-w-0">
                <strong className="block">Signed in</strong>
                <span className="text-green-700 truncate block">{user?.username}</span>
              </div>
            </div>
          </div>

          {subscriptions.length > 0 ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Subscription
                </label>
                <div className="relative">
                  <select
                    value={selectedSubId}
                    onChange={(e) => setSelectedSubId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none pr-10"
                  >
                    {subscriptions.map((sub) => (
                      <option key={sub.subscriptionId} value={sub.subscriptionId}>
                        {sub.displayName} ({sub.subscriptionId.slice(0, 8)}…)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {subscriptions.length} subscription{subscriptions.length === 1 ? '' : 's'} readable by this account.
                </p>
              </div>
              <button
                onClick={handleStartAnalysis}
                disabled={isLoading || !selectedSubId}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Start Analysis'}
              </button>
            </>
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-medium text-slate-600 mb-1">No subscriptions found</p>
              <p className="text-xs max-w-xs mx-auto">
                This account can sign in but has no enabled subscription assigned. Ask an administrator for
                at least the Reader role on the subscription you want to analyse.
              </p>
            </div>
          )}

          <button
            onClick={resetAuth}
            className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium py-2 transition-colors"
          >
            Use a different account
          </button>
        </>
      );
    }

    return (
      <>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-500" />
            <div>
              <strong>Sign in with Microsoft</strong>
              <p className="mt-1 text-slate-500">
                Opens Microsoft&apos;s own sign-in window. Overclouded requests read-only access to Azure
                Resource Manager, and the access token stays in this browser tab — it is never sent to our
                servers or written to disk.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" /> Waiting for sign-in…
            </>
          ) : (
            <>
              <svg viewBox="0 0 23 23" className="w-5 h-5" fill="none">
                <path d="M1 1h10v10H1z" fill="#f25022" />
                <path d="M12 1h10v10H12z" fill="#7fba00" />
                <path d="M1 12h10v10H1z" fill="#00a4ef" />
                <path d="M12 12h10v10H12z" fill="#ffb900" />
              </svg>
              Sign in with Microsoft
            </>
          )}
        </button>
      </>
    );
  };

  return (
    <div className={`min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white relative ${isHome ? 'overflow-hidden' : ''}`}>
      <header className={`${isHome ? 'absolute' : 'sticky'} top-0 left-0 w-full p-6 md:p-10 flex justify-between items-center z-20 ${isHome ? 'mix-blend-difference text-white lg:text-slate-900 lg:mix-blend-normal' : 'bg-white/90 backdrop-blur-sm text-slate-900'}`}>
        <div className="text-3xl md:text-4xl font-extrabold tracking-tighter cursor-pointer" onClick={() => setActiveTab('HOME')}>Overclouded<span className="align-top text-sm font-medium">TM</span></div>
        <nav className="hidden md:flex space-x-8 text-sm font-medium">
          <button onClick={() => setActiveTab('DOCS')} className={`hover:underline decoration-2 underline-offset-4 ${activeTab === 'DOCS' ? 'underline' : ''}`}>Documentation</button>
          <button onClick={() => setActiveTab('SECURITY')} className={`hover:underline decoration-2 underline-offset-4 ${activeTab === 'SECURITY' ? 'underline' : ''}`}>Security</button>
          <button onClick={() => setActiveTab('CONTACT')} className={`hover:underline decoration-2 underline-offset-4 ${activeTab === 'CONTACT' ? 'underline' : ''}`}>Contact</button>
        </nav>
      </header>

      {isHome ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full">
            <div className="relative flex flex-col justify-center p-6 md:p-12 lg:px-20 lg:py-28 order-2 lg:order-1 bg-white pt-24">{renderContent()}</div>
            <div className="relative h-[40vh] lg:h-full order-1 lg:order-2 bg-slate-100 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop" alt="Minimalist Architecture" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent lg:hidden"></div>
            </div>
          </div>
          {renderMarketing()}
        </>
      ) : (
        // Content pages get the full viewport width and scroll with the document
        // rather than being squeezed into a half-width column with its own scrollbar.
        <div className="w-full px-6 md:px-12 lg:px-20 pb-20">
          <div className="max-w-6xl mx-auto">{renderContent()}</div>
        </div>
      )}

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
              <div className="space-y-5">{renderSignIn()}</div>
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
