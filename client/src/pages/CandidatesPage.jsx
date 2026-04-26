import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import api from '../utils/api';
import { STAGE_COLORS, PIPELINE_STAGES } from '../utils/constants';
import toast from 'react-hot-toast';
import { Plus, Search, Edit3, Trash2, ExternalLink, Eye, User, Mail, Phone, Star, MessageSquare, Calendar } from 'lucide-react';

const CandidatesPage = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
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
  const [form, setForm] = useState({ name: '', email: '', phone: '', resumeLink: '', jobId: '' });
  const [roundForm, setRoundForm] = useState({ roundName: '', interviewerName: '', score: '', feedback: '', date: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [cRes, jRes] = await Promise.all([api.get('/candidates'), api.get('/jobs')]);
      setCandidates(cRes.data.data);
      setJobs(jRes.data.data);
    } catch { toast.error('Failed to fetch data'); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/candidates', form);
      setCandidates([res.data.data, ...candidates]);
      setShowAddModal(false);
      setForm({ name: '', email: '', phone: '', resumeLink: '', jobId: '' });
      toast.success('Candidate added!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
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
    setForm({ name: c.name, email: c.email, phone: c.phone, resumeLink: c.resumeLink || '', jobId: c.jobId?._id || '' });
    setShowEditModal(true);
  };

  const openDetail = async (c) => {
    setSelectedCandidate(c);
    setShowDetailModal(true);
    if (user.role === 'HR') {
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
      setRoundForm({ roundName: '', interviewerName: '', score: '', feedback: '', date: '' });
      toast.success('Round added!');
    } catch { toast.error('Failed'); }
  };

  const filtered = candidates.filter(c => {
    const ms = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const mj = !filterJob || c.jobId?._id === filterJob;
    const mst = !filterStage || c.currentStage === filterStage;
    return ms && mj && mst;
  });

  if (loading) return <Layout><Loader size="lg" text="Loading candidates..." /></Layout>;

  const FormFields = ({ onSubmit, label }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
            className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Email *</label>
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
            className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Phone *</label>
          <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required
            className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Resume Link</label>
          <input type="url" value={form.resumeLink} onChange={e => setForm({...form, resumeLink: e.target.value})}
            className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Job *</label>
        <select value={form.jobId} onChange={e => setForm({...form, jobId: e.target.value})} required
          className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400">
          <option value="">Select job</option>
          {jobs.map(j => <option key={j._id} value={j._id}>{j.title} — {j.department}</option>)}
        </select>
      </div>
      <button type="submit" className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all">{label}</button>
    </form>
  );

  return (
    <Layout>
      <div className="fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Candidates</h1>
            <p className="text-surface-500 text-sm mt-1">{filtered.length} candidates found</p>
          </div>
          <button id="add-candidate-btn" onClick={() => { setForm({ name: '', email: '', phone: '', resumeLink: '', jobId: '' }); setShowAddModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all">
            <Plus size={18} /> Add Candidate
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input id="search-candidates" type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or email..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
          </div>
          <select id="filter-job" value={filterJob} onChange={e => setFilterJob(e.target.value)}
            className="px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="">All Jobs</option>
            {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
          </select>
          <select id="filter-stage" value={filterStage} onChange={e => setFilterStage(e.target.value)}
            className="px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-4">Candidate</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-4 hidden md:table-cell">Job</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-4">Stage</th>
                  <th className="text-right text-xs font-semibold text-surface-500 uppercase px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-surface-400">No candidates found</td></tr>
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
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${sc?.bg} ${sc?.text} border ${sc?.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc?.dot}`} />{c.currentStage}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDetail(c)} className="p-2 hover:bg-primary-50 rounded-lg text-surface-400 hover:text-primary-500"><Eye size={16} /></button>
                          <button onClick={() => openEdit(c)} className="p-2 hover:bg-blue-50 rounded-lg text-surface-400 hover:text-blue-500"><Edit3 size={16} /></button>
                          {user?.role === 'HR' && <button onClick={() => handleDelete(c._id)} className="p-2 hover:bg-red-50 rounded-lg text-surface-400 hover:text-red-500"><Trash2 size={16} /></button>}
                          {c.resumeLink && <a href={c.resumeLink} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-emerald-50 rounded-lg text-surface-400 hover:text-emerald-500"><ExternalLink size={16} /></a>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Candidate">
          <FormFields onSubmit={handleAdd} label="Add Candidate" />
        </Modal>
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Candidate">
          <FormFields onSubmit={handleEdit} label="Update Candidate" />
        </Modal>
        <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setShowAddRound(false); }} title="Candidate Details" maxWidth="max-w-2xl">
          {selectedCandidate && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">{selectedCandidate.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedCandidate.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-lg text-xs font-semibold mt-1 ${STAGE_COLORS[selectedCandidate.currentStage]?.bg} ${STAGE_COLORS[selectedCandidate.currentStage]?.text}`}>{selectedCandidate.currentStage}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl"><Mail size={16} className="text-surface-400" /><span className="text-sm">{selectedCandidate.email}</span></div>
                <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl"><Phone size={16} className="text-surface-400" /><span className="text-sm">{selectedCandidate.phone}</span></div>
              </div>
              {user?.role === 'HR' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-surface-900">Interview Rounds</h4>
                    <button onClick={() => setShowAddRound(!showAddRound)} className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-xs font-semibold hover:bg-primary-100"><Plus size={14} /> Add Round</button>
                  </div>
                  {showAddRound && (
                    <form onSubmit={handleAddRound} className="p-4 bg-surface-50 rounded-xl border mb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Round Name" required value={roundForm.roundName} onChange={e => setRoundForm({...roundForm, roundName: e.target.value})} className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                        <input type="text" placeholder="Interviewer" required value={roundForm.interviewerName} onChange={e => setRoundForm({...roundForm, interviewerName: e.target.value})} className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder="Score (0-10)" min="0" max="10" required value={roundForm.score} onChange={e => setRoundForm({...roundForm, score: e.target.value})} className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                        <input type="date" required value={roundForm.date} onChange={e => setRoundForm({...roundForm, date: e.target.value})} className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                      </div>
                      <textarea placeholder="Feedback" rows={2} value={roundForm.feedback} onChange={e => setRoundForm({...roundForm, feedback: e.target.value})} className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                      <button type="submit" className="w-full py-2 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600">Save Round</button>
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
    </Layout>
  );
};

export default CandidatesPage;
