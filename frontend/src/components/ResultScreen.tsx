import { Player } from "@/lib/types";

type Props = {
  players: Player[];
  onPlayAgain: () => void;
};

const RANK_STYLES: Record<number, { bg: string; label: string; emoji: string }> = {
  1: { bg: "bg-yellow-900/50 border-yellow-500", label: "1st", emoji: "🥇" },
  2: { bg: "bg-slate-600/50 border-slate-400", label: "2nd", emoji: "🥈" },
  3: { bg: "bg-amber-900/50 border-amber-600", label: "3rd", emoji: "🥉" },
  4: { bg: "bg-slate-700/50 border-slate-600", label: "4th", emoji: "" },
};

export default function ResultScreen({ players, onPlayAgain }: Props) {
  const ranked = [...players]
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((player, i) => ({ player, rank: i + 1 }));

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h2 className="text-white text-2xl font-bold text-center mb-2">
          最終結果
        </h2>
        <p className="text-slate-400 text-sm text-center mb-6">
          5ラウンドの合計スコア
        </p>

        <div className="space-y-4">
          {ranked.map(({ player, rank }) => {
            const style = RANK_STYLES[rank] ?? RANK_STYLES[4];
            const lastEval = player.evaluation;
            return (
              <div
                key={player.id}
                className={`rounded-xl border-2 p-4 ${style.bg}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{style.emoji}</span>
                  <span className="text-white text-lg font-bold">
                    {style.label}
                  </span>
                  <span className="text-xl">{player.avatar}</span>
                  <span className="text-white font-medium">{player.name}</span>
                  <span className="ml-auto text-2xl font-bold text-white">
                    {player.totalScore}点
                  </span>
                </div>
                {lastEval && (
                  <div className="mt-2 text-slate-400 text-xs">
                    最終ラウンド: {lastEval.title} ({lastEval.score}点 / {lastEval.grade})
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={onPlayAgain}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold text-sm transition-colors"
          >
            もう一度プレイ
          </button>
        </div>
      </div>
    </div>
  );
}
