import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import api from '../utils/api';
import { STAGE_COLORS, STAGE_EMOJIS, PIPELINE_STAGES } from '../utils/constants';
import { 
  Users, Briefcase, CheckCircle, XCircle, Calendar, 
  TrendingUp, Clock, BarChart3 
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [todayInterviews, setTodayInterviews] = useState([]);
  const [jobStats, setJobStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, todayRes, jobStatsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/today'),
        api.get('/dashboard/job-stats')
      ]);
      setStats(statsRes.data.data);
      setTodayInterviews(todayRes.data.data);
      setJobStats(jobStatsRes.data.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Layout><Loader size="lg" text="Loading dashboard..." /></Layout>;
  }

  const summaryCards = [
    {
      title: 'Total Candidates',
      value: stats?.totalCandidates || 0,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/25'
    },
    {
      title: 'Open Jobs',
      value: stats?.totalJobs || 0,
      icon: Briefcase,
      gradient: 'from-purple-500 to-purple-600',
      shadow: 'shadow-purple-500/25'
    },
    {
      title: 'Selected',
      value: stats?.selectedCount || 0,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/25'
    },
    {
      title: 'Rejected',
      value: stats?.rejectedCount || 0,
      icon: XCircle,
      gradient: 'from-red-500 to-red-600',
      shadow: 'shadow-red-500/25'
    }
  ];

  return (
    <Layout>
      <div className="fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-surface-500 mt-1">Here's what's happening with your hiring pipeline</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {summaryCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-6 border border-surface-100 card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center shadow-lg ${card.shadow}`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <TrendingUp size={18} className="text-accent-500" />
                </div>
                <p className="text-3xl font-bold text-surface-900">{card.value}</p>
                <p className="text-sm text-surface-500 mt-1">{card.title}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Overview */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={20} className="text-primary-500" />
              <h2 className="text-lg font-bold text-surface-900">Pipeline Overview</h2>
            </div>

            <div className="space-y-3">
              {PIPELINE_STAGES.filter(s => s !== 'Selected' && s !== 'Rejected').map((stage) => {
                const count = stats?.stageCounts?.[stage] || 0;
                const total = stats?.totalCandidates || 1;
                const percentage = Math.round((count / total) * 100);
                const colors = STAGE_COLORS[stage];

                return (
                  <div key={stage} className="flex items-center gap-4">
                    <div className="w-32 sm:w-40 flex items-center gap-2">
                      <span className="text-lg">{STAGE_EMOJIS[stage]}</span>
                      <span className="text-sm font-medium text-surface-700 truncate">{stage}</span>
                    </div>
                    <div className="flex-1 bg-surface-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.dot} transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%`, minWidth: count > 0 ? '8px' : '0' }}
                      />
                    </div>
                    <span className="text-sm font-bold text-surface-700 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Interviews */}
          <div className="bg-white rounded-2xl border border-surface-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar size={20} className="text-primary-500" />
              <h2 className="text-lg font-bold text-surface-900">Today's Interviews</h2>
            </div>

            {todayInterviews.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={40} className="text-surface-300 mx-auto mb-3" />
                <p className="text-surface-500 text-sm">No interviews scheduled today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayInterviews.map((interview, i) => (
                  <div key={i} className="p-3 bg-surface-50 rounded-xl border border-surface-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-600">
                          {interview.candidateId?.name?.charAt(0)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-surface-800 truncate">
                        {interview.candidateId?.name}
                      </p>
                    </div>
                    <p className="text-xs text-surface-500 ml-9">{interview.roundName}</p>
                    <p className="text-xs text-primary-500 font-medium ml-9 mt-0.5">
                      {interview.interviewerName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Job-wise Stats */}
        {user?.role === 'HR' && jobStats.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-surface-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase size={20} className="text-primary-500" />
              <h2 className="text-lg font-bold text-surface-900">Candidates by Job</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobStats.map((job, i) => (
                <div key={i} className="p-4 bg-gradient-to-br from-surface-50 to-primary-50/30 rounded-xl border border-surface-100">
                  <p className="text-sm font-bold text-surface-800">{job.jobTitle}</p>
                  <p className="text-xs text-surface-400 mt-0.5">{job.department}</p>
                  <p className="text-2xl font-bold text-primary-600 mt-2">{job.count}</p>
                  <p className="text-xs text-surface-500">candidates</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
