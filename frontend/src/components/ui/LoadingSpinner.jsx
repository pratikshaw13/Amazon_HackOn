export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${sizeClasses[size]} border-3 border-gray-200 border-t-brand-green rounded-full animate-spin`}
        style={{ borderWidth: '3px' }}
      />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )
}
