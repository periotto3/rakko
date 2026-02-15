import { Player } from "@/lib/types";

type Props = {
  players: Player[];
  onReady: () => void;
  onStart: () => void;
  allReady: boolean;
};

export default function Lobby({ players, onReady, onStart, allReady }: Props) {
  const humanPlayer = players.find((p) => !p.isCPU);
  const readyCount = players.filter((p) => p.isReady).length;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-white text-xl font-bold text-center mb-1">
          対戦ロビー
        </h2>
        <p className="text-slate-400 text-sm text-center mb-6">
          player {players.length}/4
        </p>

        <div className="space-y-3 mb-6">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between bg-slate-700 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{player.avatar}</span>
                <div>
                  <span className="text-white font-medium text-sm">
                    {player.name}
                  </span>
                  {player.isCPU && (
                    <span className="ml-2 text-[10px] bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded">
                      CPU
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full ${
                  player.isReady ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={onReady}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
              humanPlayer?.isReady
                ? "bg-gray-600 text-gray-300"
                : "bg-green-600 hover:bg-green-500 text-white"
            }`}
          >
            {humanPlayer?.isReady ? "準備OK" : "準備する"}
          </button>

          <button
            onClick={onStart}
            disabled={!allReady}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
              allReady
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-slate-600 text-slate-400 cursor-not-allowed"
            }`}
          >
            スタートする ({readyCount}/{players.length})
          </button>
        </div>
      </div>
    </div>
  );
}
