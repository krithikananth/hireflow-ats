import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('HR');
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', companyId: ''
  });

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        await signup(form.name, form.email, form.password, activeTab, form.companyId);
        toast.success('Account created! Please sign in.');
        setIsSignup(false);
        setForm({ name: '', email: '', password: '', companyId: '' });
      } else {
        await login(form.email, form.password, activeTab);
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* ─── Left Branding Panel ─── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #4F46E5 0%, #6366F1 40%, #818CF8 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-20 -left-10 w-60 h-60 rounded-full opacity-10 bg-white" />
        <div className="absolute top-1/3 right-10 w-40 h-40 rounded-full opacity-5 bg-white" />

        <div className="relative z-10 flex flex-col justify-between w-full" style={{ padding: '48px' }}>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
              <span className="text-white text-xl font-bold">H</span>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">HireFlow</span>
          </div>

          {/* Main copy */}
          <div className="my-auto py-12">
            <h1 className="text-white text-4xl xl:text-[42px] font-extrabold leading-tight tracking-tight">
              Hire smarter,<br />
              not harder.
            </h1>
            <p className="text-indigo-200 text-base leading-relaxed mt-5 max-w-sm">
              Track candidates, manage interviews, and make confident hiring decisions — all from one beautiful dashboard.
            </p>

            <div className="mt-10 space-y-4">
              {[
                'Drag & drop Kanban pipeline',
                'Interview scorecards & feedback',
                'Real-time hiring analytics'
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-indigo-100 text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-indigo-300 text-xs">© 2024 HireFlow ATS. Built for modern teams.</p>
        </div>
      </div>

      {/* ─── Right Form Panel ─── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24 bg-gray-50/50">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)' }}>
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">HireFlow</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[26px] font-bold text-gray-900 tracking-tight">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-gray-500 text-[15px] mt-1.5">
              {isSignup ? 'Get started with HireFlow in seconds' : 'Sign in to continue to HireFlow'}
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1.5 mb-7" id="role-tabs">
            {['HR', 'Employee'].map((role) => (
              <button
                key={role}
                id={`tab-${role.toLowerCase()}`}
                onClick={() => setActiveTab(role)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-250 ${
                  activeTab === role
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {role === 'HR' ? 'HR Admin' : 'Employee'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {isSignup && (
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    id="input-name" type="text" name="name"
                    value={form.name} onChange={handleChange}
                    placeholder="John Doe" required
                    className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                      placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-2">Company ID</label>
                  <input
                    id="input-company" type="text" name="companyId"
                    value={form.companyId} onChange={handleChange}
                    placeholder="e.g. ACME-001" required
                    className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                      placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Email address</label>
              <input
                id="input-email" type="email" name="email"
                value={form.email} onChange={handleChange}
                placeholder="you@company.com" required
                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                  placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  id="input-password" type={showPassword ? 'text' : 'password'} name="password"
                  value={form.password} onChange={handleChange}
                  placeholder="Min 6 characters" required minLength={6}
                  className="w-full h-12 px-4 pr-12 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-500/10 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              id="submit-button" type="submit" disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-sm text-white
                flex items-center justify-center gap-2 mt-2
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignup ? 'Create Account' : 'Sign In'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-7">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              id="toggle-auth-mode"
              onClick={() => setIsSignup(!isSignup)}
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
