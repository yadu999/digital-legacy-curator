import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Upload, Sparkles, Loader2, MessageCircle, Link as LinkIcon, Users, Lock, LogOut, Menu, X, ArrowRight, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';

const API_BASE = 'http://localhost:8000';

// --- Reusable Components ---

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={`glass-panel rounded-apple p-6 apple-shadow ${className}`}
  >
    {children}
  </motion.div>
);

const AppleButton = ({ children, onClick, variant = 'primary', loading = false, disabled = false, className = "" }) => {
  const variants = {
    primary: 'bg-appleBlue hover:bg-blue-600 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white',
    accent: 'bg-appleIndigo hover:bg-indigo-600 text-white',
  };
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${variants[variant]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={20} /> : children}
    </motion.button>
  );
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('legacy_token'));
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [files, setFiles] = useState([]);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [url, setUrl] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [tone, setTone] = useState('poignant');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [view, setView] = useState('timeline');
  const [isLanding, setIsLanding] = useState(true);

  const api = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` }
  });

  // --- Handlers ---

  const fetchVaultFiles = useCallback(async () => {
    try {
      const res = await api.get('/list-files');
      setVaultFiles(res.data.files);
    } catch (e) { console.error("Error fetching files", e); }
  }, [api]);

  const handleGetLifeMap = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/lifemap');
      const entities_data = response.data.entities;
      const nodes = [{ id: 'User', color: '#a855f7' }];
      const links = [];
      if (entities_data && Array.isArray(entities_data)) {
        entities_data.forEach(ent => {
          nodes.push({ id: ent.entity, color: '#818cf8' });
          links.push({ source: 'User', target: ent.entity });
        });
      }
      setGraphData({ nodes, links });
      setView('graph');
    } catch (error) { 
      console.error("Graph Error:", error);
      alert('Graph generation failed'); 
    } finally { setLoading(false); }
  }, [api]);

  const handleAuth = async () => {
    try {
      if (authMode === 'login') {
        const res = await axios.post(`${API_BASE}/token`, {
          username: authForm.username,
          password: authForm.password
        });
        setToken(res.data.access_token);
        localStorage.setItem('legacy_token', res.data.access_token);
      } else {
        await axios.post(`${API_BASE}/register`, authForm);
        alert('Registered! Please login.');
        setAuthMode('login');
      }
    } catch (error) { alert('Auth failed'); }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('legacy_token');
  };

  const handleUpload = async () => {
    if (files.length === 0) return alert('Please select files first');
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
    try {
      await api.post('/upload', formData);
      alert('Files indexed!');
      fetchVaultFiles();
    } catch (error) { alert('Upload failed'); } finally { setUploading(false); }
  };

  const handleIngestUrl = async () => {
    if (!url) return alert('Please enter a URL');
    try {
      await api.post(`/ingest-url?url=${encodeURIComponent(url)}`);
      alert('URL indexed!');
      setUrl('');
      fetchVaultFiles();
    } catch (error) { alert('URL ingestion failed'); }
  };

  const handleCurate = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/curate?tone=${tone}`);
      const data = JSON.parse(response.data.narrative);
      setTimeline(data);
      setView('timeline');
    } catch (error) { alert('Curation failed.'); } finally { setLoading(false); }
  };

  const handleAsk = async () => {
    if (!question) return;
    setAsking(true);
    try {
      const response = await api.get(`/ask?question=${encodeURIComponent(question)}`);
      setAnswer(response.data.answer);
    } catch (error) { alert('Question failed'); } finally { setAsking(false); }
  };

  // --- Effects ---

  useEffect(() => {
    if (token) fetchVaultFiles();
  }, [token, fetchVaultFiles]);

  useEffect(() => {
    if (token && view === 'graph') {
      handleGetLifeMap();
    }
  }, [token, view, handleGetLifeMap]);

  if (isLanding) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="text-center z-10 px-4"
        >
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-6 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
            Digital Legacy Curator
          </h1>
          <p className="text-xl md:text-2xl text-appleTextSecondary max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            Every life deserves to be remembered. <br/> Preserve memories, conversations, and moments in a timeless archive.
          </p>
          <div className="flex gap-4 justify-center">
            <AppleButton onClick={() => setIsLanding(false)}>Enter the Archive <ArrowRight size={18}/></AppleButton>
          </div>
        </motion.div>
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-white rounded-full opacity-20"
              style={{ 
                width: Math.random() * 4 + 1 + 'px', 
                height: Math.random() * 4 + 1 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%'
              }}
              animate={{ 
                y: [0, -100, 0], 
                opacity: [0.2, 0.5, 0.2],
                x: [0, Math.random() * 50 - 25, 0]
              }}
              transition={{ 
                duration: Math.random() * 10 + 10, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-10 rounded-apple w-full max-w-md text-center apple-shadow"
        >
          <Lock size={48} className="mx-auto text-appleBlue mb-6" />
          <h2 className="text-3xl font-bold mb-8">{authMode === 'login' ? 'Enter Vault' : 'Create Account'}</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Username" value={authForm.username} onChange={(e) => setAuthForm({...authForm, username: e.target.value})} className="w-full p-4 rounded-2xl bg-black/50 border border-white/10 text-white focus:border-appleBlue outline-none transition-all" />
            <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 rounded-2xl bg-black/50 border border-white/10 text-white focus:border-appleBlue outline-none transition-all" />
            <AppleButton onClick={handleAuth} className="w-full">
              {authMode === 'login' ? 'Enter Vault' : 'Register'}
            </AppleButton>
          </div>
          <p className="mt-6 text-appleTextSecondary cursor-pointer text-sm hover:text-white transition-colors" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-appleBlack text-appleTextPrimary font-sans selection:bg-appleBlue/30">
      <nav className="fixed top-0 w-full z-50 flex justify-center p-6">
        <div className="glass-panel px-8 py-3 rounded-full flex items-center gap-8 text-sm font-medium text-appleTextSecondary backdrop-blur-xl border-white/10">
          <div className="text-white font-bold cursor-pointer hover:text-appleBlue transition-colors" onClick={() => setView('timeline')}>Archive</div>
          <div className="cursor-pointer hover:text-appleBlue transition-colors" onClick={() => setView('timeline')}>Timeline</div>
          <div className="cursor-pointer hover:text-appleBlue transition-colors" onClick={() => setView('graph')}>Galaxy</div>
          <div className="cursor-pointer hover:text-appleBlue transition-colors" onClick={() => setView('ask')}>Dialogue</div>
          <div className="ml-4 pl-4 border-l border-white/10 cursor-pointer hover:text-red-400 transition-colors" onClick={logout}>Logout</div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-24">
        <section className="text-center space-y-6">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tighter"
          >
            The Living Legacy
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-appleTextSecondary text-xl max-w-2xl mx-auto font-light"
          >
            A sanctuary of memories, synthesized by intelligence, preserved for eternity.
          </motion.p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GlassCard>
            <div className="flex items-center gap-3 mb-6 text-xl font-semibold">
              <Upload size={24} className="text-appleBlue" /> <span>Ingest Data</span>
            </div>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-white/10 rounded-apple p-8 text-center hover:border-appleBlue/50 transition-colors cursor-pointer relative group bg-black/20">
                <input type="file" multiple onChange={(e) => setFiles(e.target.files)} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Upload className="mx-auto mb-4 text-appleTextSecondary group-hover:text-appleBlue transition-colors" size={32} />
                <p className="text-appleTextSecondary">Drop memories here or <span className="text-appleBlue">browse</span></p>
              </div>
              <AppleButton onClick={handleUpload} loading={uploading} variant="secondary" className="w-full">
                Upload to Vault
              </AppleButton>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-6 text-xl font-semibold">
              <LinkIcon size={24} className="text-appleIndigo" /> <span>Web Archive</span>
            </div>
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="https://your-legacy.com" 
                className="w-full p-3 rounded-2xl bg-black/50 border border-white/10 text-white outline-none focus:border-appleIndigo transition-all" 
              />
              <AppleButton onClick={handleIngestUrl} variant="accent" className="w-full">Add URL</AppleButton>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-6 text-xl font-semibold">
              <FileText size={24} className="text-appleRose" /> <span>Vault Contents</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {vaultFiles.length === 0 ? (
                <p className="text-appleTextSecondary text-sm italic text-center py-4">Vault is empty</p>
              ) : (
                vaultFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-sm group hover:bg-white/10 transition-colors">
                    <span className="truncate text-appleTextPrimary">{f}</span>
                    <Trash2 size={14} className="text-appleTextSecondary opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-400 transition-all" />
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </section>

        <section className="flex flex-col items-center gap-8">
          <div className="flex p-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
            {['poignant', 'professional', 'humorous'].map((t) => (
              <button 
                key={t} 
                onClick={() => setTone(t)} 
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${tone === t ? 'bg-white text-black shadow-lg' : 'text-appleTextSecondary hover:text-white'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <AppleButton onClick={handleCurate} loading={loading} className="text-lg px-10 py-4">
            <Sparkles size={20} /> Synthesize Timeline
          </AppleButton>
        </section>

        <div className="min-h-[600px]">
          {view === 'timeline' && (
            <div className="max-w-3xl mx-auto relative border-l-2 border-white/10 pl-12 space-y-16">
              <AnimatePresence>
                {timeline.map((event, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, x: -20 }} 
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <div className="absolute -left-[25px] top-2 w-4 h-4 rounded-full bg-appleBlue shadow-[0_0_15px_rgba(10,132,255,0.5)]" />
                    <div className="text-sm font-bold text-appleBlue mb-2 uppercase tracking-widest">{event.year}</div>
                    <div className="text-3xl font-serif text-white mb-3">{event.title}</div>
                    <div className="text-appleTextSecondary text-lg leading-relaxed font-light">{event.description}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {view === 'graph' && (
            <div className="glass-panel rounded-apple h-[700px] overflow-hidden relative apple-shadow">
              <ForceGraph2D 
                graphData={graphData} 
                nodeAutoColorBy="id"
                nodeLabel="id"
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                backgroundColor="#000000"
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const label = node.id;
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Inter`;
                  ctx.fillStyle = 'rgba(245, 245, 247, 0.8)';
                  ctx.fillText(label, node.x + 8, node.y + 3);
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
                  ctx.fillStyle = node.color;
                  ctx.fill();
                }}
              />
              <div className="absolute top-6 left-6 text-sm text-appleTextSecondary bg-black/40 backdrop-blur-md p-3 rounded-lg border border-white/10">
                Interconnected Life Constellation
              </div>
            </div>
          )}

          {view === 'ask' && (
            <div className="max-w-2xl mx-auto glass-panel rounded-apple h-[600px] flex flex-col overflow-hidden apple-shadow">
              <div className="p-6 border-b border-white/10 text-center font-semibold">Dialogue with the Archive</div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {answer && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-start"
                  >
                    <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none max-w-[80%] text-appleTextPrimary leading-relaxed">
                      {answer}
                    </div>
                  </motion.div>
                )}
              </div>
              <div className="p-6 border-t border-white/10 flex gap-3">
                <input 
                  type="text" 
                  value={question} 
                  onChange={(e) => setQuestion(e.target.value)} 
                  placeholder="Ask a memory..." 
                  className="flex-1 p-3 rounded-full bg-black/50 border border-white/10 outline-none focus:border-appleBlue transition-all" 
                />
                <AppleButton onClick={handleAsk} disabled={asking}>
                  {asking ? <Loader2 className="animate-spin" /> : <MessageCircle size={20} />}
                </AppleButton>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
