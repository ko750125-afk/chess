export type Color = 'white' | 'black';

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface Position {
  x: number; // 0~7 (파일 a~h)
  y: number; // 0~7 (랭크 1~8), y=0이 백의 첫 줄
}

export interface PieceState {
  id: string;
  type: PieceType;
  color: Color;
  x: number;
  y: number;
  hasMoved: boolean;
}

export interface Move {
  pieceId: string;
  from: Position;
  to: Position;
  isEnPassant?: boolean;
  isCastle?: 'kingside' | 'queenside';
  promotion?: PieceType;
}

export interface LastMove {
  pieceId: string;
  from: Position;
  to: Position;
  isDoublePawnPush?: boolean;
}

export const PIECE_UNICODE: Record<Color, Record<PieceType, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};

export const PROMOTION_CHOICES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];
