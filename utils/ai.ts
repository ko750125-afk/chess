import { PieceState, Color, PieceType, Move, LastMove } from '../types';
import { getAllLegalMoves, simulateMove, isPromotionMove, toLastMove } from './engine';
import { isInCheck } from './rules';

const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3.25,
  rook: 5,
  queen: 9,
  king: 0,
};

// 폰이 전진할수록, 나이트/비숍이 중앙에 있을수록 약간의 가산점을 줘서 AI가 더 자연스럽게 둔다.
function getPositionWeight(piece: PieceState): number {
  let weight = 0;

  if (piece.type === 'pawn') {
    weight += (piece.color === 'white' ? piece.y : 7 - piece.y) * 0.1;
  }

  if (piece.type === 'knight' || piece.type === 'bishop') {
    const distFromCenterX = Math.abs(piece.x - 3.5);
    const distFromCenterY = Math.abs(piece.y - 3.5);
    weight += (3.5 - distFromCenterX) * 0.05 + (3.5 - distFromCenterY) * 0.05;
  }

  return weight;
}

export function evaluateBoard(pieces: PieceState[], aiColor: Color): number {
  let score = 0;
  for (const piece of pieces) {
    const value = PIECE_VALUES[piece.type] + getPositionWeight(piece);
    score += piece.color === aiColor ? value : -value;
  }
  return score;
}

/** 프로모션 대상 수는 항상 퀸으로 승진시킨다 (오토 퀸). */
function withAutoQueen(move: Move, piece: PieceState): Move {
  if (isPromotionMove(piece, move.to)) return { ...move, promotion: 'queen' };
  return move;
}

export interface MoveResult {
  move: Move;
  score: number;
}

export function minimax(
  pieces: PieceState[],
  depth: number,
  alpha: number,
  beta: number,
  aiColor: Color,
  currentColor: Color,
  lastMove: LastMove | null
): number {
  const legalMoves = getAllLegalMoves(pieces, currentColor, lastMove);

  if (legalMoves.length === 0) {
    if (isInCheck(pieces, currentColor)) {
      // 체크메이트: 지금 둘 차례인 쪽이 진 것
      return currentColor === aiColor ? -100000 - depth : 100000 + depth;
    }
    return 0; // 스테일메이트(무승부)
  }

  if (depth === 0) {
    return evaluateBoard(pieces, aiColor);
  }

  const isMaximizing = currentColor === aiColor;
  const nextColor: Color = currentColor === 'white' ? 'black' : 'white';
  let best = isMaximizing ? -Infinity : Infinity;

  for (const rawMove of legalMoves) {
    const piece = pieces.find((p) => p.id === rawMove.pieceId)!;
    const move = withAutoQueen(rawMove, piece);
    const nextPieces = simulateMove(pieces, move);
    const nextLastMove = toLastMove(move, piece);

    const evalScore = minimax(nextPieces, depth - 1, alpha, beta, aiColor, nextColor, nextLastMove);

    if (isMaximizing) {
      best = Math.max(best, evalScore);
      alpha = Math.max(alpha, evalScore);
    } else {
      best = Math.min(best, evalScore);
      beta = Math.min(beta, evalScore);
    }
    if (beta <= alpha) break; // Alpha-Beta Pruning
  }

  return best;
}

export function findBestMove(
  pieces: PieceState[],
  depth: number,
  aiColor: Color,
  lastMove: LastMove | null
): MoveResult | null {
  const legalMoves = getAllLegalMoves(pieces, aiColor, lastMove);
  if (legalMoves.length === 0) return null;

  // 항상 같은 수만 두지 않도록 후보 순서를 섞는다.
  const shuffled = [...legalMoves].sort(() => Math.random() - 0.5);

  const opponentColor: Color = aiColor === 'white' ? 'black' : 'white';
  let bestScore = -Infinity;
  let bestMove: Move | null = null;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const rawMove of shuffled) {
    const piece = pieces.find((p) => p.id === rawMove.pieceId)!;
    const move = withAutoQueen(rawMove, piece);
    const nextPieces = simulateMove(pieces, move);
    const nextLastMove = toLastMove(move, piece);

    const score = minimax(nextPieces, depth - 1, alpha, beta, aiColor, opponentColor, nextLastMove);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
  }

  return bestMove ? { move: bestMove, score: bestScore } : null;
}
