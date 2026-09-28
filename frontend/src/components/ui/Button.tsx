
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const VARIANT_STYLES = {
  primary: 'bg-[#0B6E6E] text-white hover:bg-[#095A5A] border border-[#0B6E6E] disabled:opacity-50',
  secondary: 'bg-white text-[#101828] border border-[#E4E7EC] hover:bg-[#F5F6F8] disabled:opacity-50',
  destructive: 'bg-white text-[#B42318] border border-[#B42318] hover:bg-[#FEF3F2] disabled:opacity-50',
  ghost: 'bg-transparent text-[#475467] hover:bg-[#F5F6F8] border border-transparent disabled:opacity-50',
};

const SIZE_STYLES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium rounded-[6px] transition-colors duration-[140ms] focus-visible:outline-2 focus-visible:outline-[#0B6E6E] focus-visible:outline-offset-2 cursor-pointer',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        loading ? 'opacity-60 cursor-not-allowed' : '',
        className,
      ].join(' ')}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
