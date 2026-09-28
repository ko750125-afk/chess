'use client';

import React from 'react';
import { Color, PieceType } from '../types';

interface ChessPieceProps {
  type: PieceType;
  color: Color;
  className?: string;
  isTight?: boolean;
  selected?: boolean;
  size?: number | string;
}

export default function ChessPiece({
  type,
  color,
  className = '',
  isTight = false,
  selected = false,
  size,
}: ChessPieceProps) {
  const fileName = isTight
    ? `/pieces/${color}_${type}_tight.png`
    : `/pieces/${color}_${type}.png`;

  const shadowClass =
    color === 'white'
      ? 'drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] filter'
      : 'drop-shadow-[0_6px_8px_rgba(0,0,0,0.65)] filter';

  const selectedClass = selected
    ? 'scale-110 -translate-y-1.5 drop-shadow-[0_12px_16px_rgba(0,0,0,0.6)]'
    : 'hover:scale-[1.03]';

  return (
    <div
      className={`relative flex items-center justify-center pointer-events-none select-none transition-all duration-200 ease-out ${selectedClass} ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <img
        src={fileName}
        alt={`${color} ${type}`}
        className={`w-full h-full object-contain ${shadowClass}`}
        draggable={false}
      />
    </div>
  );
}
