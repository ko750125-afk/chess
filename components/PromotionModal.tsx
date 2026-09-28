'use client';

import { Color, PROMOTION_CHOICES, PieceType } from '../types';
import ChessPiece from './ChessPiece';

interface PromotionModalProps {
  color: Color;
  onChoose: (type: PieceType) => void;
}

const PIECE_NAMES_KO: Record<PieceType, string> = {
  king: '킹',
  queen: '퀸',
  rook: '룩',
  bishop: '비숍',
  knight: '나이트',
  pawn: '폰',
};

export default function PromotionModal({ color, onChoose }: PromotionModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-800/95 border border-white/15 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full mx-4">
        <div className="text-center">
          <h3 className="text-white font-extrabold text-xl tracking-tight">기물 승진 (Promotion)</h3>
          <p className="text-neutral-400 text-sm mt-1">폰을 승진시킬 새로운 기물을 선택하세요</p>
        </div>

        <div className="grid grid-cols-4 gap-3 w-full">
          {PROMOTION_CHOICES.map((type) => (
            <button
              key={type}
              onClick={() => onChoose(type)}
              type="button"
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-neutral-700/60 hover:bg-neutral-600/80 active:scale-95 border border-white/5 hover:border-amber-400/40 transition-all duration-150 group cursor-pointer"
            >
              <div className="w-14 h-14 flex items-center justify-center">
                <ChessPiece
                  type={type}
                  color={color}
                  isTight
                  className="w-full h-full max-h-13 group-hover:scale-110 transition-transform"
                />
              </div>
              <span className="text-neutral-300 text-xs font-semibold mt-1 group-hover:text-white">
                {PIECE_NAMES_KO[type]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
