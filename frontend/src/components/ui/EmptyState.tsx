import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#667085]">
      <Inbox className="w-10 h-10 opacity-40" strokeWidth={1.5} />
      <p className="font-medium text-sm">{title}</p>
      {description && <p className="text-xs text-center max-w-xs">{description}</p>}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#667085]">
      <p className="font-medium text-sm text-[#B42318]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-[#0B6E6E] underline hover:no-underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
