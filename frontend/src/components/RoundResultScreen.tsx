import { Player } from "@/lib/types";

type Props = {
  players: Player[];
  round: number;
  maxRounds: number;
  onNextRound: () => void;
};

export default function RoundResultScreen({ players, round, maxRounds, onNextRound }: Props) {
  const ranked = [...players]
    .filter((p) => p.evaluation)
    .sort((a, b) => (b.evaluation?.score ?? 0) - (a.evaluation?.score ?? 0));

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <h2 className="text-white text-2xl font-bold text-center mb-2">
          ラウンド {round} / {maxRounds} 結果
        </h2>
        <p className="text-slate-400 text-sm text-center mb-6">
          次のラウンドに進みましょう
        </p>

        <div className="space-y-3">
          {ranked.map((player) => {
            const evaluation = player.evaluation!;
            return (
              <div
                key={player.id}
                className="bg-slate-800 rounded-xl border border-slate-600 p-4 flex items-center gap-4"
              >
                <span className="text-xl">{player.avatar}</span>
                <div className="flex-1">
                  <div className="text-white font-bold text-sm">{player.name}</div>
                  <div className="text-slate-400 text-xs">{evaluation.title}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-lg font-bold ${
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
                    <span className="text-sm ml-1">({evaluation.grade})</span>
                  </div>
                  <div className="text-slate-400 text-xs">
                    合計: {player.totalScore}点
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={onNextRound}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold text-sm transition-colors"
          >
            次のラウンドへ
          </button>
        </div>
      </div>
    </div>
  );
}
