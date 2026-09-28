import { PieceState, Color, LastMove } from '../types';
import { findBestMove } from '../utils/ai';

self.onmessage = (e: MessageEvent) => {
  const { pieces, depth, aiColor, lastMove } = e.data as {
    pieces: PieceState[];
    depth: number;
    aiColor: Color;
    lastMove: LastMove | null;
  };

  try {
    const result = findBestMove(pieces, depth, aiColor, lastMove);
    self.postMessage({ type: 'SUCCESS', result });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: String(error) });
  }
};
