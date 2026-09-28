import { PieceState, Color, Move, LastMove, Position } from '../types';
import { getPseudoLegalMoves, isInCheck } from './rules';

/** 이동을 적용한 새 보드 상태를 반환 (캡처, 앙파상, 캐슬링, 프로모션 처리) */
export function simulateMove(pieces: PieceState[], move: Move): PieceState[] {
  let next = pieces.map((p) => ({ ...p }));
  const mover = next.find((p) => p.id === move.pieceId);
  if (!mover) return next;

  if (move.isEnPassant) {
    const capturedY = mover.color === 'white' ? move.to.y - 1 : move.to.y + 1;
    next = next.filter((p) => !(p.x === move.to.x && p.y === capturedY));
  } else {
    next = next.filter((p) => !(p.x === move.to.x && p.y === move.to.y && p.id !== mover.id));
  }

  mover.x = move.to.x;
  mover.y = move.to.y;
  mover.hasMoved = true;
  if (move.promotion) mover.type = move.promotion;

  if (move.isCastle) {
    const y = move.from.y;
    if (move.isCastle === 'kingside') {
      const rook = next.find((p) => p.x === 7 && p.y === y && p.type === 'rook');
      if (rook) {
        rook.x = 5;
        rook.hasMoved = true;
      }
    } else {
      const rook = next.find((p) => p.x === 0 && p.y === y && p.type === 'rook');
      if (rook) {
        rook.x = 3;
        rook.hasMoved = true;
      }
    }
  }

  return next;
}

/** 특정 기물이 실제로 둘 수 있는 수 (둔 뒤 자기 왕이 체크에 걸리는 수는 제외) */
export function getLegalMoves(piece: PieceState, pieces: PieceState[], lastMove: LastMove | null): Move[] {
  return getPseudoLegalMoves(piece, pieces, lastMove).filter((move) => {
    const next = simulateMove(pieces, move);
    return !isInCheck(next, piece.color);
  });
}

export function getAllLegalMoves(pieces: PieceState[], color: Color, lastMove: LastMove | null): Move[] {
  const all: Move[] = [];
  for (const p of pieces.filter((p) => p.color === color)) {
    all.push(...getLegalMoves(p, pieces, lastMove));
  }
  return all;
}

export function isCheckmate(pieces: PieceState[], color: Color, lastMove: LastMove | null): boolean {
  return isInCheck(pieces, color) && getAllLegalMoves(pieces, color, lastMove).length === 0;
}

export function isStalemate(pieces: PieceState[], color: Color, lastMove: LastMove | null): boolean {
  return !isInCheck(pieces, color) && getAllLegalMoves(pieces, color, lastMove).length === 0;
}

export function isPromotionMove(piece: PieceState, to: Position): boolean {
  if (piece.type !== 'pawn') return false;
  return (piece.color === 'white' && to.y === 7) || (piece.color === 'black' && to.y === 0);
}

export function toLastMove(move: Move, piece: PieceState): LastMove {
  return {
    pieceId: move.pieceId,
    from: move.from,
    to: move.to,
    isDoublePawnPush: piece.type === 'pawn' && Math.abs(move.to.y - move.from.y) === 2,
  };
}
