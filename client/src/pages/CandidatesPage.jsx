import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import api from '../utils/api';
import { STAGE_COLORS, PIPELINE_STAGES } from '../utils/constants';
import toast from 'react-hot-toast';
import {
  Plus, Search, Edit3, Trash2, ExternalLink, Eye, User, Mail,
  Phone, Star, MessageSquare, Calendar, Circle, ChevronDown,
  Brain, CheckCircle, Clock, AlertCircle, TrendingUp, Shield, Layers, Download
} from 'lucide-react';

const getForwardStages = (currentStage) => {
  const orderedStages = ['Applied', 'Screening', 'Technical Round 1', 'Technical Round 2', 'HR Round', 'Selected'];
  const currentIndex = orderedStages.indexOf(currentStage);
  if (currentIndex === -1 || currentStage === 'Selected' || currentStage === 'Rejected') return [];
  const forward = orderedStages.slice(currentIndex + 1);
  forward.push('Rejected');
  return forward;
};

const inputClass = "w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400";

// ─── Resume Score Badge (shown in candidate list for HR) ──────────────────────
const ScoreBadge = ({ score, status }) => {
  if (status === 'skipped') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-50 border border-surface-200 text-surface-400 text-xs">
        No resume
      </span>
    );
  }
  if (status === 'pending' || status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium">
        <Clock size={11} className="animate-spin" /> ATS checking...
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs">
        <AlertCircle size={11} /> ATS failed
      </span>
    );
  }
  if (status === 'done' && score !== null) {
    const color = score >= 7 ? 'emerald' : score >= 5 ? 'amber' : 'red';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-${color}-50 border border-${color}-200 text-${color}-700 text-xs font-semibold`}>
        <Brain size={11} /> ATS {score}/10
      </span>
    );
  }
  return null;
};

// ─── Circular Score Ring ──────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 80 }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 10) * circumference;
  const color = score >= 7 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="16" fontWeight="700"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
};

// ─── Sub-score bar ────────────────────────────────────────────────────────────
const SubScoreBar = ({ label, score, icon: Icon }) => {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-surface-600 font-medium"><Icon size={12}/>{label}</span>
        <span className="font-semibold text-surface-800">{score}/10</span>
      </div>
      <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
};

// ─── Full ATS Resume Card (shown in HR detail modal) ─────────────────────────
const ResumeScoreCard = ({ candidateId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollingCount, setPollingCount] = useState(0);

  const fetchScore = useCallback(async () => {
    try {
      const res = await api.get(`/candidates/${candidateId}/resume-score`);
      setData(res.data.data);
      return res.data.data.resumeCheckStatus;
    } catch {
      setData(null);
      return 'failed';
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    let timer;
    const poll = async () => {
      const status = await fetchScore();
      // Keep polling if still processing, up to 12 attempts (60s)
      if ((status === 'pending' || status === 'processing') && pollingCount < 12) {
        setPollingCount(n => n + 1);
        timer = setTimeout(poll, 5000);
      }
    };
    poll();
    return () => clearTimeout(timer);
  }, [fetchScore, pollingCount]);

  if (loading) return (
    <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-xl border border-surface-100">
      <Clock size={18} className="text-amber-500 animate-spin"/>
      <span className="text-sm text-surface-500">Loading ATS analysis...</span>
    </div>
  );

  if (!data) return null;

  const { resumeCheckStatus, resumeScore, resumeAnalysis, resumeCheckedAt } = data;

  if (resumeCheckStatus === 'skipped') return (
    <div className="p-4 bg-surface-50 rounded-xl border border-surface-100 text-sm text-surface-400 flex items-center gap-2">
      <AlertCircle size={16}/> No resume uploaded — ATS check skipped
    </div>
  );

  if (resumeCheckStatus === 'pending' || resumeCheckStatus === 'processing') return (
    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
      <div className="flex items-center gap-3">
        <Brain size={20} className="text-amber-500"/>
        <div>
          <p className="text-sm font-semibold text-amber-700">ATS Resume Analysis in Progress</p>
          <p className="text-xs text-amber-600 mt-0.5">AI is evaluating the candidate's resume against the job requirements...</p>
        </div>
        <Clock size={16} className="ml-auto text-amber-500 animate-spin flex-shrink-0"/>
      </div>
    </div>
  );

  if (resumeCheckStatus === 'failed') return (
    <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-sm text-red-600 flex items-center gap-2">
      <AlertCircle size={16}/> ATS analysis failed. The AI could not process this resume.
    </div>
  );

  // ── done ──
  const score = resumeScore ?? 0;
  const scoreColor = score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : 'text-red-500';
  const badgeBg = score >= 7 ? 'bg-emerald-50 border-emerald-200' : score >= 5 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const label = score >= 8 ? 'Excellent Fit' : score >= 6 ? 'Good Fit' : score >= 4 ? 'Partial Fit' : 'Poor Fit';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain size={16} className="text-primary-500"/>
        <h4 className="font-bold text-surface-900 text-sm">ATS Resume Score</h4>
        <span className="ml-auto text-xs text-surface-400">
          {resumeCheckedAt ? new Date(resumeCheckedAt).toLocaleString() : ''}
        </span>
      </div>

      {/* Score + sub-scores */}
      <div className={`flex items-center gap-5 p-4 rounded-xl border ${badgeBg}`}>
        <ScoreRing score={score} size={76}/>
        <div className="flex-1 space-y-2.5">
          <div>
            <p className={`text-xl font-bold ${scoreColor}`}>{score}/10</p>
            <p className={`text-xs font-semibold ${scoreColor}`}>{label}</p>
          </div>
          {resumeAnalysis?.skillsMatch != null &&
            <SubScoreBar label="Skills match" score={resumeAnalysis.skillsMatch} icon={TrendingUp}/>}
          {resumeAnalysis?.experienceMatch != null &&
            <SubScoreBar label="Experience" score={resumeAnalysis.experienceMatch} icon={Layers}/>}
          {resumeAnalysis?.presentationScore != null &&
            <SubScoreBar label="Presentation" score={resumeAnalysis.presentationScore} icon={Shield}/>}
        </div>
      </div>

      {/* Summary */}
      {resumeAnalysis?.overallSummary && (
        <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
          <p className="text-xs text-surface-600 leading-relaxed">{resumeAnalysis.overallSummary}</p>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-3">
        {resumeAnalysis?.strengths?.length > 0 && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1">
              <CheckCircle size={12}/> Strengths
            </p>
            <ul className="space-y-1">
              {resumeAnalysis.strengths.map((s, i) => (
                <li key={i} className="text-xs text-emerald-700 flex items-start gap-1.5">
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0"/>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {resumeAnalysis?.weaknesses?.length > 0 && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
              <AlertCircle size={12}/> Gaps
            </p>
            <ul className="space-y-1">
              {resumeAnalysis.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-red-400 flex-shrink-0"/>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {resumeAnalysis?.recommendation && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-bold text-blue-700 mb-1">Recommendation</p>
          <p className="text-xs text-blue-700">{resumeAnalysis.recommendation}</p>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const CandidatesPage = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [hrList, setHrList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [interviewRounds, setInterviewRounds] = useState([]);
  const [showAddRound, setShowAddRound] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', resumeFile: null, jobId: '', assignedHR: '' });
  const [roundForm, setRoundForm] = useState({ roundName: '', interviewerName: '', score: '', feedback: '', date: '', time: '' });
  const [addingCandidate, setAddingCandidate] = useState(false);
  // Schedule modal for stage change
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '' });

  const isEmployee = user?.role === 'Employee';
  const isHR = user?.role === 'HR';

  // CSV Export function
  const exportToCSV = () => {
    if (filtered.length === 0) { toast.error('No candidates to export'); return; }
    const headers = ['Name', 'Email', 'Phone', 'Job Title', 'Department', 'Stage', 'ATS Score', 'ATS Status'];
    const rows = filtered.map(c => [
      c.name,
      c.email,
      c.phone || '',
      c.jobId?.title || '',
      c.jobId?.department || '',
      c.currentStage,
      c.resumeScore !== null && c.resumeScore !== undefined ? c.resumeScore + '/10' : 'N/A',
      c.resumeCheckStatus || 'N/A'
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hireflow_candidates_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} candidates to CSV`);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const promises = [api.get('/candidates'), api.get('/jobs')];
      if (isEmployee) promises.push(api.get('/users/hr'));
      const results = await Promise.all(promises);
      setCandidates(results[0].data.data);
      setJobs(results[1].data.data);
      if (isEmployee && results[2]) setHrList(results[2].data.data);
    } catch { toast.error('Failed to fetch data'); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (isEmployee && !form.assignedHR) { toast.error('Please select an HR'); return; }
    setAddingCandidate(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('phone', form.phone);
      formData.append('jobId', form.jobId);
      if (form.assignedHR) formData.append('assignedHR', form.assignedHR);
      if (form.resumeFile) formData.append('resumeFile', form.resumeFile);

      const res = await api.post('/candidates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCandidates([res.data.data, ...candidates]);
      setShowAddModal(false);
      setForm({ name: '', email: '', phone: '', resumeFile: null, jobId: '', assignedHR: '' });
      if (form.resumeFile) {
        toast.success('Candidate added! ATS resume analysis started in the background.');
      } else {
        toast.success('Candidate added! (No resume uploaded — ATS check skipped)');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setAddingCandidate(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/candidates/${selectedCandidate._id}`, form);
      setCandidates(candidates.map(c => c._id === selectedCandidate._id ? res.data.data : c));
      setShowEditModal(false);
      toast.success('Updated!');
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this candidate?')) return;
    try {
      await api.delete(`/candidates/${id}`);
      setCandidates(candidates.filter(c => c._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const openEdit = (c) => {
    setSelectedCandidate(c);
    setForm({ name: c.name, email: c.email, phone: c.phone, resumeFile: null, jobId: c.jobId?._id || '', assignedHR: c.assignedHR?._id || '' });
    setShowEditModal(true);
  };

  const openDetail = async (c) => {
    setSelectedCandidate(c);
    setShowDetailModal(true);
    if (isHR) {
      try { const r = await api.get(`/interviews/${c._id}`); setInterviewRounds(r.data.data); }
      catch { setInterviewRounds([]); }
    }
  };

  const handleAddRound = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/interviews', { ...roundForm, candidateId: selectedCandidate._id, score: Number(roundForm.score) });
      setInterviewRounds([...interviewRounds, res.data.data]);
      setShowAddRound(false);
      setRoundForm({ roundName: '', interviewerName: '', score: '', feedback: '', date: '', time: '' });
      toast.success('Round added!');
      // Refresh occupied slots
      try { const s = await api.get('/interviews/schedule/occupied'); setOccupiedSlots(s.data.data); } catch {}
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add round'); }
  };

  const handleStageChange = async (candidateId, newStage) => {
    // Open schedule modal for interview stages
    const interviewStages = ['Screening', 'Technical Round 1', 'Technical Round 2', 'HR Round'];
    if (interviewStages.includes(newStage)) {
      setPendingStageChange({ candidateId, newStage });
      setScheduleForm({ date: '', time: '' });
      setShowScheduleModal(true);
      // Fetch occupied slots
      try { const s = await api.get('/interviews/schedule/occupied'); setOccupiedSlots(s.data.data); } catch {}
      return;
    }
    // For Selected/Rejected, move directly
    try {
      const res = await api.put(`/candidates/${candidateId}/stage`, { stage: newStage });
      setCandidates(candidates.map(c => c._id === candidateId ? res.data.data : c));
      toast.success(`Moved to ${newStage}`);
    } catch { toast.error('Failed to update stage'); }
  };

  const confirmStageChange = async () => {
    if (!pendingStageChange) return;
    const { candidateId, newStage } = pendingStageChange;
    try {
      // Schedule the interview first
      if (scheduleForm.date && scheduleForm.time) {
        const candidate = candidates.find(c => c._id === candidateId);
        await api.post('/interviews', {
          candidateId,
          roundName: newStage,
          interviewerName: 'TBD',
          score: 0,
          feedback: '',
          date: scheduleForm.date,
          time: scheduleForm.time
        });
      }
      // Move the stage
      const res = await api.put(`/candidates/${candidateId}/stage`, { stage: newStage });
      setCandidates(candidates.map(c => c._id === candidateId ? res.data.data : c));
      toast.success(`Moved to ${newStage}${scheduleForm.date ? ` — Interview: ${scheduleForm.date} at ${scheduleForm.time}` : ''}`);
      setShowScheduleModal(false);
      setPendingStageChange(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update stage'); }
  };

  const filtered = candidates.filter(c => {
    const ms = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const mj = !filterJob || c.jobId?._id === filterJob;
    const mst = !filterStage || c.currentStage === filterStage;
    return ms && mj && (isEmployee ? true : mst);
  });

  if (loading) return <Layout><Loader size="lg" text="Loading candidates..." /></Layout>;

  const renderForm = (onSubmit, label, isSubmitting = false) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={e => setForm(prev => ({...prev, name: e.target.value}))} required className={inputClass} placeholder="Full name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Email *</label>
          <input type="email" value={form.email} onChange={e => setForm(prev => ({...prev, email: e.target.value}))} required className={inputClass} placeholder="email@example.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Phone *</label>
          <input type="text" value={form.phone} onChange={e => setForm(prev => ({...prev, phone: e.target.value}))} required className={inputClass} placeholder="9876543210" />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Resume File</label>
          <input type="file" onChange={e => setForm(prev => ({...prev, resumeFile: e.target.files[0]}))} className={inputClass} accept=".pdf,.txt" />
        </div>
      </div>
      {form.resumeFile && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          <Brain size={14}/> ATS resume analysis will run automatically after adding
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Job *</label>
        <select value={form.jobId} onChange={e => setForm(prev => ({...prev, jobId: e.target.value}))} required className={inputClass}>
          <option value="">Select job</option>
          {jobs.map(j => <option key={j._id} value={j._id}>{j.title} — {j.department}</option>)}
        </select>
      </div>
      {isEmployee && (
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Assign to HR *</label>
          <select value={form.assignedHR} onChange={e => setForm(prev => ({...prev, assignedHR: e.target.value}))} required className={inputClass}>
            <option value="">Select HR</option>
            {hrList.map(hr => (
              <option key={hr._id} value={hr._id}>
                {hr.name} ({hr.email}) {hr.isOnline ? '🟢 Online' : '⚫ Offline'}
              </option>
            ))}
          </select>
        </div>
      )}
      <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {isSubmitting ? <><Clock size={16} className="animate-spin"/> Processing...</> : label}
      </button>
    </form>
  );

  return (
    <Layout>
      <div className="fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Candidates</h1>
            <p className="text-surface-500 text-sm mt-1">{filtered.length} candidates found{isEmployee && ' (added by you)'}</p>
          </div>
          <div className="flex items-center gap-2">
            {isHR && (
              <button onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-200 text-surface-700 rounded-xl font-semibold text-sm hover:bg-surface-50 hover:border-surface-300 transition-all">
                <Download size={16} /> Export CSV
              </button>
            )}
            <button onClick={() => { setForm({ name: '', email: '', phone: '', resumeFile: null, jobId: '', assignedHR: '' }); setShowAddModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all">
              <Plus size={18} /> Add Candidate
            </button>
          </div>
        </div>

        {isEmployee && hrList.length > 0 && (
          <div className="bg-white rounded-2xl border border-surface-100 p-4 mb-6">
            <h3 className="text-sm font-semibold text-surface-700 mb-3">HR Team</h3>
            <div className="flex flex-wrap gap-3">
              {hrList.map(hr => (
                <div key={hr._id} className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-xl border border-surface-100">
                  <Circle size={8} className={hr.isOnline ? 'fill-emerald-500 text-emerald-500' : 'fill-surface-300 text-surface-300'} />
                  <span className="text-sm font-medium text-surface-700">{hr.name}</span>
                  <span className="text-xs text-surface-400">{hr.email}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or email..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
          </div>
          <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
            className="px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="">All Jobs</option>
            {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
          </select>
          {isHR && (
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
              className="px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
              <option value="">All Stages</option>
              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-4">Candidate</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-4 hidden md:table-cell">Job</th>
                  {isHR && <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-4">Stage</th>}
                  {isHR && <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-4">ATS Score</th>}
                  {isEmployee && <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-4">Assigned HR</th>}
                  {isEmployee && <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-4">Resume</th>}
                  <th className="text-right text-xs font-semibold text-surface-500 uppercase px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-surface-400">No candidates found</td></tr>
                ) : filtered.map(c => {
                  const sc = STAGE_COLORS[c.currentStage];
                  return (
                    <tr key={c._id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">{c.name?.charAt(0)?.toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-surface-800">{c.name}</p>
                            <p className="text-xs text-surface-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <p className="text-sm text-surface-700">{c.jobId?.title}</p>
                        <p className="text-xs text-surface-400">{c.jobId?.department}</p>
                      </td>
                      {isHR && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${sc?.bg} ${sc?.text} border ${sc?.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc?.dot}`} />{c.currentStage}
                            </span>
                            {getForwardStages(c.currentStage).length > 0 && (
                              <div className="relative">
                                <select
                                  onChange={e => { if (e.target.value) { handleStageChange(c._id, e.target.value); e.target.value = ''; } }}
                                  defaultValue=""
                                  className="appearance-none pl-2 pr-6 py-1 bg-surface-50 border border-surface-200 rounded-lg text-xs text-surface-600 cursor-pointer hover:bg-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                                  <option value="" disabled>Move to →</option>
                                  {getForwardStages(c.currentStage).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      {/* ATS Score column — HR only */}
                      {isHR && (
                        <td className="px-6 py-4">
                          <ScoreBadge score={c.resumeScore} status={c.resumeCheckStatus} />
                        </td>
                      )}
                      {isEmployee && (
                        <td className="px-6 py-4">
                          <p className="text-sm text-surface-700">{c.assignedHR?.name || 'Not assigned'}</p>
                          <p className="text-xs text-surface-400">{c.assignedHR?.email || ''}</p>
                        </td>
                      )}
                      {/* Resume check status for employee (no score shown) */}
                      {isEmployee && (
                        <td className="px-6 py-4">
                          {c.resumeCheckStatus === 'pending' || c.resumeCheckStatus === 'processing' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <Clock size={11} className="animate-spin"/> Checking...
                            </span>
                          ) : c.resumeCheckStatus === 'done' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle size={11}/> Reviewed
                            </span>
                          ) : c.resumeCheckStatus === 'skipped' ? (
                            <span className="text-xs text-surface-400">No resume</span>
                          ) : c.resumeCheckStatus === 'failed' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-500">
                              <AlertCircle size={11}/> Failed
                            </span>
                          ) : null}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDetail(c)} className="p-2 hover:bg-primary-50 rounded-lg text-surface-400 hover:text-primary-500"><Eye size={16} /></button>
                          <button onClick={() => openEdit(c)} className="p-2 hover:bg-blue-50 rounded-lg text-surface-400 hover:text-blue-500"><Edit3 size={16} /></button>
                          {isHR && <button onClick={() => handleDelete(c._id)} className="p-2 hover:bg-red-50 rounded-lg text-surface-400 hover:text-red-500"><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        <Modal isOpen={showAddModal} onClose={() => !addingCandidate && setShowAddModal(false)} title="Add New Candidate">
          {renderForm(handleAdd, 'Add Candidate', addingCandidate)}
        </Modal>

        {/* Edit Modal */}
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Candidate">
          {renderForm(handleEdit, 'Update Candidate')}
        </Modal>

        {/* Detail Modal */}
        <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setShowAddRound(false); }} title="Candidate Details" maxWidth="max-w-2xl">
          {selectedCandidate && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">{selectedCandidate.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedCandidate.name}</h3>
                  {isHR && selectedCandidate.currentStage && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-lg text-xs font-semibold mt-1 ${STAGE_COLORS[selectedCandidate.currentStage]?.bg} ${STAGE_COLORS[selectedCandidate.currentStage]?.text}`}>
                      {selectedCandidate.currentStage}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl"><Mail size={16} className="text-surface-400" /><span className="text-sm">{selectedCandidate.email}</span></div>
                <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl"><Phone size={16} className="text-surface-400" /><span className="text-sm">{selectedCandidate.phone}</span></div>
              </div>

              {/* ── ATS Resume Score (HR only) ── */}
              {isHR && (
                <div>
                  <ResumeScoreCard candidateId={selectedCandidate._id} />
                </div>
              )}

              {/* ── Interview Rounds (HR only) ── */}
              {isHR && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-surface-900">Interview Rounds</h4>
                    <button onClick={() => { setShowAddRound(!showAddRound); if (!showAddRound) { api.get('/interviews/schedule/occupied').then(r => setOccupiedSlots(r.data.data)).catch(() => {}); } }} className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-xs font-semibold hover:bg-primary-100"><Plus size={14} /> Add Round</button>
                  </div>
                  {showAddRound && (
                    <form onSubmit={handleAddRound} className="p-4 bg-surface-50 rounded-xl border mb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <select required value={roundForm.roundName} onChange={e => setRoundForm(prev => ({...prev, roundName: e.target.value}))} className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                          <option value="" disabled>Select Round</option>
                          <option value="Screening">Screening</option>
                          <option value="Technical Round 1">Technical Round 1</option>
                          <option value="Technical Round 2">Technical Round 2</option>
                          <option value="HR Round">HR Round</option>
                          <option value="Final Review">Final Review</option>
                        </select>
                        <input type="text" placeholder="Interviewer" required value={roundForm.interviewerName} onChange={e => setRoundForm(prev => ({...prev, interviewerName: e.target.value}))} className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <input type="number" placeholder="Score (0-10)" min="0" max="10" required value={roundForm.score} onChange={e => setRoundForm(prev => ({...prev, score: e.target.value}))} className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                        <input type="date" required value={roundForm.date} onChange={e => setRoundForm(prev => ({...prev, date: e.target.value}))} className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                        <input type="time" required value={roundForm.time} onChange={e => setRoundForm(prev => ({...prev, time: e.target.value}))} className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                      </div>
                      <textarea placeholder="Feedback" rows={2} value={roundForm.feedback} onChange={e => setRoundForm(prev => ({...prev, feedback: e.target.value}))} className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                      <button type="submit" className="w-full py-2 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600">Save Round</button>
                      {/* Occupied Slots */}
                      {occupiedSlots.length > 0 && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1"><AlertCircle size={12} /> Occupied Slots</p>
                          <div className="space-y-1">
                            {occupiedSlots.map((s, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-amber-800 font-medium">{new Date(s.date).toLocaleDateString()} at {s.time}</span>
                                <span className="text-amber-600">{s.candidateId?.name} — {s.roundName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </form>
                  )}
                  {interviewRounds.length === 0 ? <p className="text-sm text-surface-400 text-center py-4">No rounds yet</p> : (
                    <div className="space-y-3">
                      {interviewRounds.map((r, i) => (
                        <div key={i} className="p-4 bg-surface-50 rounded-xl border border-surface-100">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-bold text-surface-800">{r.roundName}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-xs text-surface-500"><User size={12} /> {r.interviewerName}</span>
                                <span className="flex items-center gap-1 text-xs text-surface-500"><Calendar size={12} /> {new Date(r.date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1 text-xs text-surface-500"><Clock size={12} /> {r.time || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 px-3 py-1 bg-primary-50 rounded-lg">
                              <Star size={14} className="text-primary-500" />
                              <span className="text-sm font-bold text-primary-600">{r.score}/10</span>
                            </div>
                          </div>
                          {r.feedback && <div className="mt-2 flex items-start gap-2"><MessageSquare size={14} className="text-surface-400 mt-0.5" /><p className="text-xs text-surface-600">{r.feedback}</p></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>

      {/* ── Schedule Modal (Stage Change) ── */}
      <Modal isOpen={showScheduleModal} onClose={() => { setShowScheduleModal(false); setPendingStageChange(null); }} title={`Schedule ${pendingStageChange?.newStage || 'Interview'}`}>
        <div className="space-y-4">
          <p className="text-sm text-surface-600">
            Set the interview date and time for <b>{pendingStageChange?.newStage}</b>.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-500 mb-1">Date *</label>
              <input type="date" required value={scheduleForm.date} onChange={e => setScheduleForm(prev => ({...prev, date: e.target.value}))} className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 mb-1">Time *</label>
              <input type="time" required value={scheduleForm.time} onChange={e => setScheduleForm(prev => ({...prev, time: e.target.value}))} className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
          </div>

          {/* Occupied Slots */}
          {occupiedSlots.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1"><AlertCircle size={12} /> Already Occupied Slots</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {occupiedSlots.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-amber-800 font-medium flex items-center gap-1"><Calendar size={10} /> {new Date(s.date).toLocaleDateString()} at {s.time}</span>
                    <span className="text-amber-600">{s.candidateId?.name} — {s.roundName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setShowScheduleModal(false); setPendingStageChange(null); }} className="flex-1 py-2.5 bg-surface-100 text-surface-600 rounded-lg text-sm font-semibold hover:bg-surface-200">
              Cancel
            </button>
            <button
              onClick={confirmStageChange}
              disabled={!scheduleForm.date || !scheduleForm.time}
              className="flex-1 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm & Move Stage
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default CandidatesPage;
