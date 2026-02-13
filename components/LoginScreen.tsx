import React, { useState, useRef, useCallback } from 'react';
import { ArrowRight, X, Loader2, Terminal, AlertCircle, ShieldCheck, Mail, Phone, Lock, ChevronLeft, ChevronDown, Check, Copy, ExternalLink } from 'lucide-react';
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
            <h2 className="text-3xl font-bold mb-6">Security Architecture</h2>
            <div className="space-y-6">
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4"><ShieldCheck className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Zero Persistence Policy</h3>
                <p className="text-slate-600 leading-relaxed">We take security seriously. <strong>Nothing is stored on our servers.</strong> This application runs entirely as a Client-Side SPA with a lightweight local CLI proxy.</p>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4"><Lock className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Azure CLI Authentication</h3>
                <p className="text-slate-600 leading-relaxed">Authentication uses the <strong>Azure CLI device code flow</strong> — the same mechanism as <code className="bg-slate-100 px-1 rounded font-mono">az login --use-device-code</code>. You sign in on Microsoft's website. <strong>No credentials or tokens are entered in this app.</strong></p>
              </div>
              <div className="text-sm text-slate-400 italic mt-8 border-t border-slate-100 pt-6">"Designed with privacy by default. We provide the lens, not the storage."</div>
            </div>
          </div>
        );
      case 'CONTACT':
        return (
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <button onClick={() => setActiveTab('HOME')} className="flex items-center text-slate-400 hover:text-slate-900 mb-6 transition-colors"><ChevronLeft className="w-4 h-4 mr-1" /> Back to Home</button>
            <h2 className="text-3xl font-bold mb-8">Contact Us</h2>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-slate-900 to-slate-800"></div>
              <div className="relative -mt-4 mb-4"><div className="w-24 h-24 bg-white p-1 rounded-full mx-auto shadow-lg"><img src="https://ui-avatars.com/api/?name=Promit+Bhattacherjee&background=0F172A&color=fff&size=128" alt="Promit" className="w-full h-full rounded-full object-cover" /></div></div>
              <h3 className="text-2xl font-bold text-slate-900">Promit Bhattacherjee</h3>
              <p className="text-slate-500 mb-8">Lead Architect</p>
              <div className="space-y-4 text-left max-w-xs mx-auto">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"><div className="bg-white p-2 rounded-full shadow-sm"><Phone className="w-5 h-5 text-slate-900" /></div><span className="font-medium text-slate-700">9742757917</span></div>
                <a href="mailto:promit.xi@gmail.com" className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"><div className="bg-white p-2 rounded-full shadow-sm"><Mail className="w-5 h-5 text-slate-900" /></div><span className="font-medium text-slate-700">promit.xi@gmail.com</span></a>
                <a href="https://x.com" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"><div className="bg-white p-2 rounded-full shadow-sm flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-900" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg></div><span className="font-medium text-slate-700">@promit_xi</span></a>
              </div>
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
