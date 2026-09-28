export function SkeletonRow() {
  return (
    <tr className="border-b border-[#E4E7EC]">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[#F2F4F7] rounded animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5 flex flex-col gap-2 animate-pulse">
      <div className="h-3 w-24 bg-[#F2F4F7] rounded" />
      <div className="h-8 w-16 bg-[#F2F4F7] rounded" />
    </div>
  );
}
