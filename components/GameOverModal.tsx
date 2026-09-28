'use client';

import { Color } from '../types';
import ChessPiece from './ChessPiece';

interface GameOverModalProps {
  result: { type: 'checkmate'; winner: Color } | { type: 'stalemate' };
  onRestart: () => void;
}

const COLOR_LABEL: Record<Color, string> = { white: '백(White)', black: '흑(Black)' };

export default function GameOverModal({ result, onRestart }: GameOverModalProps) {
  const isCheckmate = result.type === 'checkmate';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
      <div className="bg-neutral-800/95 p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/15 text-center flex flex-col items-center gap-5 max-w-sm w-full">
        {isCheckmate ? (
          <>
            <div className="w-24 h-24 flex items-center justify-center filter drop-shadow-xl animate-bounce">
              <ChessPiece type="king" color={result.winner} isTight className="w-full h-full max-h-20" />
            </div>
            <div>
              <span className="text-amber-400 text-2xl sm:text-3xl font-extrabold block">
                🎉 {COLOR_LABEL[result.winner]} 승리!
              </span>
              <span className="text-neutral-400 text-sm mt-1 block">체크메이트 (Checkmate)</span>
            </div>
          </>
        ) : (
          <div>
            <span className="text-gray-200 text-2xl sm:text-3xl font-extrabold block">무승부</span>
            <span className="text-neutral-400 text-sm mt-1 block">스테일메이트 (Stalemate)</span>
          </div>
        )}

        <button
          onClick={onRestart}
          type="button"
          className="mt-2 w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-900 rounded-xl font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          새로운 게임 시작
        </button>
      </div>
    </div>
  );
}
