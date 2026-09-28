
interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  loading?: boolean;
}

export function KpiCard({ label, value, sub, accent = false, loading = false }: KpiCardProps) {
  return (
    <div
      className="bg-white border border-[#E4E7EC] rounded-[10px] p-5 flex flex-col gap-1"
      style={{ boxShadow: '0 1px 2px 0 rgba(16,24,40,0.05)' }}
    >
      <span className="text-xs font-medium text-[#667085] uppercase tracking-[0.04em]">{label}</span>
      {loading ? (
        <div className="h-8 w-16 bg-[#F2F4F7] rounded animate-pulse" />
      ) : (
        <span
          className="text-3xl font-semibold tracking-tight"
          style={{ color: accent ? '#0B6E6E' : '#101828' }}
        >
          {value}
        </span>
      )}
      {sub && <span className="text-xs text-[#667085]">{sub}</span>}
    </div>
  );
}
