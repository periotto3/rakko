import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-2">Rakko</h1>
        <p className="text-lg text-slate-400">AWS構成バトル</p>
        <p className="text-sm text-slate-500 mt-1">
          AWSリソースを集めて最強のアーキテクチャを構築せよ
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Link
          href="/waiting"
          className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xl transition-colors shadow-lg"
        >
          対戦する
        </Link>
      </div>

      <div className="mt-8 text-slate-600 text-sm">
        <p>4人対戦 | ドラフト3ラウンド | LLM採点</p>
      </div>
    </div>
  );
}
