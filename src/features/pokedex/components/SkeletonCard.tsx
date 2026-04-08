export const SkeletonCard = (): JSX.Element => {
  return (
    <div className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-4 shadow-neon">
      <div className="h-5 w-16 rounded-full bg-white/10" />
      <div className="mt-4 rounded-2xl bg-white/10 p-4">
        <div className="mx-auto h-32 w-32 rounded-full bg-white/10" />
      </div>
      <div className="mt-4 h-6 w-3/4 rounded-full bg-white/10" />
      <div className="mt-2 h-4 w-1/2 rounded-full bg-white/10" />
      <div className="mt-4 flex gap-2">
        <div className="h-7 w-16 rounded-full bg-white/10" />
        <div className="h-7 w-16 rounded-full bg-white/10" />
      </div>
    </div>
  );
};