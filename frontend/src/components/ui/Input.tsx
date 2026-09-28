
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#101828]">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={[
          'h-9 px-3 text-sm text-[#101828] bg-white border rounded-[6px] w-full',
          'placeholder:text-[#667085]',
          'focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1',
          'transition-colors duration-[140ms]',
          error ? 'border-[#B42318] focus:ring-[#B42318]' : 'border-[#E4E7EC] hover:border-[#D0D5DD]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        ].join(' ')}
      />
      {error && <p className="text-xs text-[#B42318]">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  id: string;
}

export function Textarea({ label, error, id, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#101828]">
        {label}
      </label>
      <textarea
        id={id}
        {...props}
        className={[
          'px-3 py-2 text-sm text-[#101828] bg-white border rounded-[6px] w-full resize-none',
          'placeholder:text-[#667085]',
          'focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1',
          'transition-colors duration-[140ms]',
          error ? 'border-[#B42318]' : 'border-[#E4E7EC] hover:border-[#D0D5DD]',
          className,
        ].join(' ')}
      />
      {error && <p className="text-xs text-[#B42318]">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  id: string;
}

export function Select({ label, error, id, className = '', children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#101828]">
        {label}
      </label>
      <select
        id={id}
        {...props}
        className={[
          'h-9 px-3 text-sm text-[#101828] bg-white border rounded-[6px] w-full',
          'focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1',
          'transition-colors duration-[140ms]',
          error ? 'border-[#B42318]' : 'border-[#E4E7EC] hover:border-[#D0D5DD]',
          className,
        ].join(' ')}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[#B42318]">{error}</p>}
    </div>
  );
}
