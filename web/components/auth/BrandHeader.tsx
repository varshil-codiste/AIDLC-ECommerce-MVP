export function BrandHeader() {
  return (
    <div className="text-center mb-8">
      <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Codiste Commerce</h1>
      <p className="text-sm text-gray-500 mt-1">AI-powered shopping. Sign in to continue.</p>
    </div>
  );
}
