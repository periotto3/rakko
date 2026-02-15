import { Player } from "@/lib/types";
import ResourceCard from "./ResourceCard";

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
    .filter((p) => p.evaluation)
    .sort((a, b) => (b.evaluation?.score ?? 0) - (a.evaluation?.score ?? 0))
    .map((player, i) => ({ player, rank: i + 1, evaluation: player.evaluation! }));

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h2 className="text-white text-2xl font-bold text-center mb-6">
          結果発表
        </h2>

        <div className="space-y-4">
          {ranked.map(({ player, rank, evaluation }) => {
            const style = RANK_STYLES[rank] ?? RANK_STYLES[4];
            return (
              <div
                key={player.id}
                className={`rounded-xl border-2 p-4 ${style.bg}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{style.emoji}</span>
                  <span className="text-white text-lg font-bold">
                    {style.label}
                  </span>
                  <span className="text-xl">{player.avatar}</span>
                  <span className="text-white font-medium">{player.name}</span>
                  <span
                    className={`ml-auto text-2xl font-bold ${
                      evaluation.grade === "S"
                        ? "text-yellow-400"
                        : evaluation.grade === "A"
                          ? "text-green-400"
                          : evaluation.grade === "B"
                            ? "text-blue-400"
                            : evaluation.grade === "C"
                              ? "text-orange-400"
                              : "text-gray-400"
                    }`}
                  >
                    {evaluation.score}点
                    <span className="text-base ml-1">({evaluation.grade})</span>
                  </span>
                </div>

                <div className="mb-2">
                  <span className="text-slate-300 text-sm font-medium">
                    {evaluation.title}
                  </span>
                  <span className="text-slate-400 text-xs ml-2">
                    {evaluation.feedback}
                  </span>
                </div>

                {/* Architecture resources */}
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {(player.selectedResources.length > 0
                    ? player.selectedResources
                    : player.hand
                  ).map((r) => (
                    <ResourceCard key={r.id} resource={r} compact />
                  ))}
                </div>

                {/* Strengths & Weaknesses */}
                <div className="flex gap-4 text-xs">
                  {evaluation.strengths.length > 0 && (
                    <div className="text-green-400">
                      {evaluation.strengths.map((s, i) => (
                        <span key={i}>+ {s} </span>
                      ))}
                    </div>
                  )}
                  {evaluation.weaknesses.length > 0 && (
                    <div className="text-red-400">
                      {evaluation.weaknesses.map((w, i) => (
                        <span key={i}>- {w} </span>
                      ))}
                    </div>
                  )}
                </div>
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
