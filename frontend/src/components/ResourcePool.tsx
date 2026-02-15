type Props = {
  remainingCount: number;
  round: number;
  maxRounds: number;
};

export default function ResourcePool({ remainingCount, round, maxRounds }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-slate-400 text-sm font-medium">
        ラウンド {round}/{maxRounds}
      </div>
      <div className="relative w-20 h-24">
        {[2, 1, 0].map((offset) => (
          <div
            key={offset}
            className="absolute w-16 h-20 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 border border-slate-400 shadow-md"
            style={{
              top: offset * 2,
              left: offset * 2,
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg z-10">
            {remainingCount}
          </span>
        </div>
      </div>
      <div className="text-slate-500 text-xs">残りリソース</div>
    </div>
  );
}
