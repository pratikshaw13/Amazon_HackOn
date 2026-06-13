import clsx from 'clsx'

const variants = {
  green: 'bg-brand-green-light text-brand-green',
  blue: 'bg-brand-blue-light text-brand-blue',
  amber: 'bg-brand-amber-light text-brand-amber',
  red: 'bg-brand-red-light text-brand-red',
  gray: 'bg-gray-100 text-gray-600'
}

export default function Badge({ children, variant = 'green', className = '' }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
