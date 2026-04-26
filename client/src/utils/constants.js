export const PIPELINE_STAGES = [
  'Applied',
  'Screening',
  'Technical Round 1',
  'Technical Round 2',
  'HR Round',
  'Selected',
  'Rejected'
];

export const STAGE_COLORS = {
  'Applied': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  'Screening': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Technical Round 1': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  'Technical Round 2': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  'HR Round': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  'Selected': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Rejected': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' }
};

export const STAGE_EMOJIS = {
  'Applied': '📋',
  'Screening': '🔍',
  'Technical Round 1': '💻',
  'Technical Round 2': '🧪',
  'HR Round': '🤝',
  'Selected': '✅',
  'Rejected': '❌'
};
