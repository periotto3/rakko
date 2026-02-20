"use client";

import { useEffect, useState } from "react";
import { ThemeSlot } from "@/lib/babanuki/types";

interface GeneratingScreenProps {
  theme: ThemeSlot;
  onComplete: () => void;
}

export default function GeneratingScreen({
  theme,
  onComplete,
}: GeneratingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Random increment speed to simulate AI generation
        return Math.min(prev + Math.random() * 8 + 2, 100);
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(onComplete, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  const themeText = `${theme.who} ${theme.when} ${theme.where} ${theme.what}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          画面を生成中...
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          テーマ: 「{themeText}」
        </p>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-sm text-gray-400">
          {progress < 30
            ? "AIがテーマを解析中..."
            : progress < 60
              ? "背景画像を生成中..."
              : progress < 90
                ? "カードデザインを作成中..."
                : "まもなく完了..."}
        </p>

        <p className="text-lg font-bold text-gray-700 mt-2">
          {Math.floor(progress)}%
        </p>
      </div>
    </div>
  );
}
