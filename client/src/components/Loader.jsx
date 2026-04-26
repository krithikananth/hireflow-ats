const Loader = ({ size = 'md', text = '' }) => {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className={`${sizes[size]} border-primary-200 border-t-primary-500 rounded-full animate-spin`} />
      {text && <p className="text-surface-500 text-sm font-medium">{text}</p>}
    </div>
  );
};

export default Loader;
