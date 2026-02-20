import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-green-800 mb-2">Rakko</h1>
        <p className="text-lg text-green-600">みんなで遊ぼう</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Link
          href="/babanuki"
          className="px-10 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xl transition-colors shadow-lg"
        >
          ババ抜き
        </Link>
      </div>
    </div>
  );
}
