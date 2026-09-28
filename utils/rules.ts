import { PieceState, Position, Color, Move, LastMove } from '../types';

export const isOutOfBounds = (x: number, y: number): boolean => x < 0 || x > 7 || y < 0 || y > 7;

export const getPieceAt = (pieces: PieceState[], x: number, y: number): PieceState | undefined =>
  pieces.find((p) => p.x === x && p.y === y);

const ROOK_DIRS: Position[] = [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }];
const BISHOP_DIRS: Position[] = [{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }];
const QUEEN_DIRS: Position[] = [...ROOK_DIRS, ...BISHOP_DIRS];
const KNIGHT_OFFSETS: Position[] = [
  { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: -1 }, { x: 1, y: -2 },
  { x: -1, y: -2 }, { x: -2, y: -1 }, { x: -2, y: 1 }, { x: -1, y: 2 },
];

function slidingAttacks(piece: PieceState, pieces: PieceState[], dirs: Position[]): Position[] {
  const result: Position[] = [];
  for (const dir of dirs) {
    let x = piece.x + dir.x;
    let y = piece.y + dir.y;
    while (!isOutOfBounds(x, y)) {
      const occ = getPieceAt(pieces, x, y);
      if (occ) {
        if (occ.color !== piece.color) result.push({ x, y });
        break;
      }
      result.push({ x, y });
      x += dir.x;
      y += dir.y;
    }
  }
  return result;
}

/** 기물이 위협하는 칸 목록 (자기 왕이 체크인지, 캐슬링 경로가 안전한지 판단할 때 사용) */
export function getAttackSquares(piece: PieceState, pieces: PieceState[]): Position[] {
  switch (piece.type) {
    case 'rook':
      return slidingAttacks(piece, pieces, ROOK_DIRS);
    case 'bishop':
      return slidingAttacks(piece, pieces, BISHOP_DIRS);
    case 'queen':
      return slidingAttacks(piece, pieces, QUEEN_DIRS);
    case 'knight':
      return KNIGHT_OFFSETS.map((o) => ({ x: piece.x + o.x, y: piece.y + o.y })).filter(
        (p) => !isOutOfBounds(p.x, p.y)
      );
    case 'king':
      return QUEEN_DIRS.map((d) => ({ x: piece.x + d.x, y: piece.y + d.y })).filter(
        (p) => !isOutOfBounds(p.x, p.y)
      );
    case 'pawn': {
      const dir = piece.color === 'white' ? 1 : -1;
      return [{ x: piece.x - 1, y: piece.y + dir }, { x: piece.x + 1, y: piece.y + dir }].filter(
        (p) => !isOutOfBounds(p.x, p.y)
      );
    }
    default:
      return [];
  }
}

export function isSquareAttacked(pieces: PieceState[], x: number, y: number, byColor: Color): boolean {
  for (const p of pieces) {
    if (p.color !== byColor) continue;
    if (getAttackSquares(p, pieces).some((a) => a.x === x && a.y === y)) return true;
  }
  return false;
}

/** 특정 칸을 공격하고 있는 적 기물의 ID 목록을 반환 */
export function getAttackers(pieces: PieceState[], x: number, y: number, byColor: Color): string[] {
  const attackerIds: string[] = [];
  for (const p of pieces) {
    if (p.color !== byColor) continue;
    if (getAttackSquares(p, pieces).some((a) => a.x === x && a.y === y)) {
      attackerIds.push(p.id);
    }
  }
  return attackerIds;
}

export function findKing(pieces: PieceState[], color: Color): PieceState | undefined {
  return pieces.find((p) => p.type === 'king' && p.color === color);
}

export function isInCheck(pieces: PieceState[], color: Color): boolean {
  const king = findKing(pieces, color);
  if (!king) return false;
  const enemy: Color = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(pieces, king.x, king.y, enemy);
}

/** 자기 왕이 체크에 걸리는지는 고려하지 않은, 순수 기물 이동 규칙 기반의 이동 목록 */
export function getPseudoLegalMoves(
  piece: PieceState,
  pieces: PieceState[],
  lastMove: LastMove | null
): Move[] {
  const moves: Move[] = [];
  const push = (to: Position, extra: Partial<Move> = {}) => {
    moves.push({ pieceId: piece.id, from: { x: piece.x, y: piece.y }, to, ...extra });
  };

  if (piece.type === 'pawn') {
    const dir = piece.color === 'white' ? 1 : -1;
    const startY = piece.color === 'white' ? 1 : 6;

    if (!isOutOfBounds(piece.x, piece.y + dir) && !getPieceAt(pieces, piece.x, piece.y + dir)) {
      push({ x: piece.x, y: piece.y + dir });
      if (piece.y === startY && !getPieceAt(pieces, piece.x, piece.y + 2 * dir)) {
        push({ x: piece.x, y: piece.y + 2 * dir });
      }
    }

    for (const dx of [-1, 1]) {
      const tx = piece.x + dx;
      const ty = piece.y + dir;
      if (isOutOfBounds(tx, ty)) continue;
      const target = getPieceAt(pieces, tx, ty);
      if (target && target.color !== piece.color) {
        push({ x: tx, y: ty });
      } else if (!target && lastMove?.isDoublePawnPush) {
        const enemyPawn = getPieceAt(pieces, lastMove.to.x, lastMove.to.y);
        if (
          enemyPawn &&
          enemyPawn.color !== piece.color &&
          enemyPawn.type === 'pawn' &&
          lastMove.to.y === piece.y &&
          lastMove.to.x === tx
        ) {
          push({ x: tx, y: ty }, { isEnPassant: true });
        }
      }
    }
    return moves;
  }

  if (piece.type === 'knight') {
    for (const o of KNIGHT_OFFSETS) {
      const tx = piece.x + o.x;
      const ty = piece.y + o.y;
      if (isOutOfBounds(tx, ty)) continue;
      const target = getPieceAt(pieces, tx, ty);
      if (!target || target.color !== piece.color) push({ x: tx, y: ty });
    }
    return moves;
  }

  if (piece.type === 'king') {
    for (const d of QUEEN_DIRS) {
      const tx = piece.x + d.x;
      const ty = piece.y + d.y;
      if (isOutOfBounds(tx, ty)) continue;
      const target = getPieceAt(pieces, tx, ty);
      if (!target || target.color !== piece.color) push({ x: tx, y: ty });
    }

    if (!piece.hasMoved && !isInCheck(pieces, piece.color)) {
      const y = piece.y;
      const enemy: Color = piece.color === 'white' ? 'black' : 'white';

      const kRook = getPieceAt(pieces, 7, y);
      if (
        kRook &&
        kRook.type === 'rook' &&
        !kRook.hasMoved &&
        !getPieceAt(pieces, 5, y) &&
        !getPieceAt(pieces, 6, y) &&
        !isSquareAttacked(pieces, 5, y, enemy) &&
        !isSquareAttacked(pieces, 6, y, enemy)
      ) {
        push({ x: 6, y }, { isCastle: 'kingside' });
      }

      const qRook = getPieceAt(pieces, 0, y);
      if (
        qRook &&
        qRook.type === 'rook' &&
        !qRook.hasMoved &&
        !getPieceAt(pieces, 1, y) &&
        !getPieceAt(pieces, 2, y) &&
        !getPieceAt(pieces, 3, y) &&
        !isSquareAttacked(pieces, 2, y, enemy) &&
        !isSquareAttacked(pieces, 3, y, enemy)
      ) {
        push({ x: 2, y }, { isCastle: 'queenside' });
      }
    }
    return moves;
  }

  const dirs = piece.type === 'rook' ? ROOK_DIRS : piece.type === 'bishop' ? BISHOP_DIRS : QUEEN_DIRS;
  for (const sq of slidingAttacks(piece, pieces, dirs)) push(sq);
  return moves;
}
