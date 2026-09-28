import { PieceState, PieceType } from '../types';

const BACK_ROW: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

export function getInitialSetup(): PieceState[] {
  const pieces: PieceState[] = [];

  for (let x = 0; x < 8; x++) {
    pieces.push({ id: `white-${BACK_ROW[x]}-${x}`, type: BACK_ROW[x], color: 'white', x, y: 0, hasMoved: false });
    pieces.push({ id: `white-pawn-${x}`, type: 'pawn', color: 'white', x, y: 1, hasMoved: false });

    pieces.push({ id: `black-${BACK_ROW[x]}-${x}`, type: BACK_ROW[x], color: 'black', x, y: 7, hasMoved: false });
    pieces.push({ id: `black-pawn-${x}`, type: 'pawn', color: 'black', x, y: 6, hasMoved: false });
  }

  return pieces;
}
