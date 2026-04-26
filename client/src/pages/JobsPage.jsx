import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Edit3, Trash2, Briefcase, Users, MapPin } from 'lucide-react';

const JobsPage = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState({ title: '', department: '', description: '' });

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs');
      setJobs(res.data.data);
    } catch { toast.error('Failed to fetch jobs'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingJob) {
        const res = await api.put(`/jobs/${editingJob._id}`, form);
        setJobs(jobs.map(j => j._id === editingJob._id ? res.data.data : j));
        toast.success('Job updated!');
      } else {
        const res = await api.post('/jobs', form);
        setJobs([res.data.data, ...jobs]);
        toast.success('Job created!');
      }
      closeModal();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this job?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      setJobs(jobs.filter(j => j._id !== id));
      toast.success('Job deleted');
    } catch { toast.error('Failed'); }
  };

  const openEdit = (job) => {
    setEditingJob(job);
    setForm({ title: job.title, department: job.department, description: job.description });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingJob(null);
    setForm({ title: '', department: '', description: '' });
  };

  if (loading) return <Layout><Loader size="lg" text="Loading jobs..." /></Layout>;

  const deptColors = {
    'Engineering': 'from-blue-500 to-blue-600',
    'Design': 'from-pink-500 to-pink-600',
    'Marketing': 'from-amber-500 to-amber-600',
    'Sales': 'from-emerald-500 to-emerald-600',
    'HR': 'from-purple-500 to-purple-600',
    'Finance': 'from-cyan-500 to-cyan-600',
    'Operations': 'from-orange-500 to-orange-600',
  };
  const getGradient = (dept) => deptColors[dept] || 'from-primary-500 to-primary-600';

  return (
    <Layout>
      <div className="fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Job Postings</h1>
            <p className="text-surface-500 text-sm mt-1">{jobs.length} open positions</p>
          </div>
          {user?.role === 'HR' && (
            <button id="create-job-btn" onClick={() => { setForm({ title: '', department: '', description: '' }); setShowModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all">
              <Plus size={18} /> Create Job
            </button>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-surface-100">
            <Briefcase size={48} className="mx-auto text-surface-300 mb-4" />
            <p className="text-surface-500 font-medium">No jobs posted yet</p>
            {user?.role === 'HR' && <p className="text-sm text-surface-400 mt-1">Create your first job posting</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map(job => (
              <div key={job._id} className="bg-white rounded-2xl border border-surface-100 overflow-hidden card-hover group">
                <div className={`h-2 bg-gradient-to-r ${getGradient(job.department)}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 bg-gradient-to-br ${getGradient(job.department)} rounded-xl flex items-center justify-center shadow-md`}>
                      <Briefcase size={20} className="text-white" />
                    </div>
                    {user?.role === 'HR' && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(job)} className="p-1.5 hover:bg-blue-50 rounded-lg text-surface-400 hover:text-blue-500"><Edit3 size={15} /></button>
                        <button onClick={() => handleDelete(job._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-surface-400 hover:text-red-500"><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-surface-900 mb-1">{job.title}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center gap-1 text-xs font-medium text-surface-500"><MapPin size={12} />{job.department}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${job.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-sm text-surface-500 leading-relaxed line-clamp-3">{job.description}</p>
                  {job.createdBy && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-100">
                      <div className="w-6 h-6 bg-surface-200 rounded-full flex items-center justify-center">
                        <Users size={12} className="text-surface-500" />
                      </div>
                      <span className="text-xs text-surface-400">Posted by {job.createdBy.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={showModal} onClose={closeModal} title={editingJob ? 'Edit Job' : 'Create New Job'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Job Title *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g. Senior React Developer"
                className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Department *</label>
              <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} required
                className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400">
                <option value="">Select department</option>
                {['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Description *</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} required rows={4} placeholder="Job description..."
                className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none" />
            </div>
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all">
              {editingJob ? 'Update Job' : 'Create Job'}
            </button>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default JobsPage;
