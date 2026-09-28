'use client';

import { PieceState, Position, Move, Color } from '../types';
import ChessPiece from './ChessPiece';

interface BoardProps {
  pieces: PieceState[];
  selectedId: string | null;
  legalMoves: Move[];
  lastMove: { from: Position; to: Position } | null;
  checkedColor: Color | null;
  threatPieceIds: string[];
  onSquareClick: (x: number, y: number) => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function Board({
  pieces,
  selectedId,
  legalMoves,
  lastMove,
  checkedColor,
  threatPieceIds,
  onSquareClick,
}: BoardProps) {
  const ranks = [7, 6, 5, 4, 3, 2, 1, 0]; // 8랭크(상단) ~ 1랭크(하단)

  return (
    <div 
      className="w-[min(82vh,94vw)] aspect-square max-w-[820px] rounded-lg sm:rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)] select-none relative"
      style={{
        // 3D 우드 프레임 및 금박(Gold Inlay) 느낌
        border: 'solid 12px #3e2723',
        boxShadow: 'inset 0 0 0 3px #d4af37, 0 20px 40px rgba(0,0,0,0.8)',
        backgroundColor: '#3e2723',
      }}
    >
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {ranks.map((y) =>
          FILES.map((_, x) => {
            const isDark = (x + y) % 2 === 0;
            const piece = pieces.find((p) => p.x === x && p.y === y);
            const move = legalMoves.find((m) => m.to.x === x && m.to.y === y);
            const isLastMove =
              lastMove &&
              ((lastMove.from.x === x && lastMove.from.y === y) ||
                (lastMove.to.x === x && lastMove.to.y === y));
            const isKingInCheck =
              checkedColor && piece?.type === 'king' && piece.color === checkedColor;
            const isSelected = piece ? selectedId === piece.id : false;
            const isThreat = piece ? threatPieceIds.includes(piece.id) : false;

            // 월넛(Dark)과 메이플(Light) 고급 목재 질감 그라데이션 및 이너 섀도우
            const tileStyle = isDark
              ? 'bg-gradient-to-br from-[#795548] to-[#4e342e] shadow-[inset_0_0_12px_rgba(0,0,0,0.5)]'
              : 'bg-gradient-to-br from-[#f5deb3] to-[#d2b48c] shadow-[inset_0_0_8px_rgba(139,69,19,0.3)]';

            return (
              <button
                key={`${x}-${y}`}
                onClick={() => onSquareClick(x, y)}
                type="button"
                className={`relative w-full h-full flex items-center justify-center select-none transition-colors p-0 overflow-hidden cursor-pointer
                  ${tileStyle}
                  ${isSelected ? 'ring-2 sm:ring-4 ring-inset ring-amber-400 after:absolute after:inset-0 after:bg-amber-400/20 after:pointer-events-none' : ''}
                `}
              >
                {/* 킹 체크 하이라이트 */}
                {isKingInCheck && (
                  <span className="absolute inset-0 bg-red-600/60 animate-pulse z-0 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.8) 0%, rgba(220,38,38,0) 70%)' }} />
                )}

                {/* 위협 기물 경고 하이라이트 (킹 이동 제한 원인 표시) */}
                {isThreat && (
                  <span className="absolute inset-0 z-30 pointer-events-none ring-4 ring-inset ring-red-500 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.45) 0%, rgba(239,68,68,0) 60%)' }} />
                )}

                {/* 3D 기물 접지 그림자 (Contact Shadow) */}
                {piece && (
                  <div 
                    className="absolute bottom-[2%] w-[60%] h-[12%] z-0 rounded-[50%] blur-[3px] opacity-70 pointer-events-none" 
                    style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)' }}
                  />
                )}

                {/* 실물 체스말 */}
                {piece && (
                  <ChessPiece
                    type={piece.type}
                    color={piece.color}
                    selected={isSelected}
                    className="relative z-10 w-full h-full"
                  />
                )}

                {/* 이동 가능 위치 표시 */}
                {move && !piece && (
                  <span className="absolute w-[24%] h-[24%] rounded-full bg-black/40 shadow-inner z-20 pointer-events-none transition-transform hover:scale-125" />
                )}
                {move && piece && (
                  <span className="absolute inset-[6%] rounded-full ring-4 ring-black/50 z-20 pointer-events-none" />
                )}

                {/* 체스판 좌표 표시 */}
                {x === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] sm:text-xs md:text-sm font-bold pointer-events-none select-none z-0 ${
                      isDark ? 'text-[#f5deb3]/70' : 'text-[#4e342e]/70'
                    }`}
                  >
                    {y + 1}
                  </span>
                )}
                {y === 0 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] sm:text-xs md:text-sm font-bold pointer-events-none select-none z-0 ${
                      isDark ? 'text-[#f5deb3]/70' : 'text-[#4e342e]/70'
                    }`}
                  >
                    {FILES[x]}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
