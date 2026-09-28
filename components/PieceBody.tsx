'use client';

import * as THREE from 'three';
import { PieceType } from '../types';
import { getPieceModel, PIECE_BANDS } from '../utils/pieceModels';

interface PieceBodyProps {
  type: PieceType;
  material: THREE.Material;
}

/** 말의 3D 형태(몸체 + 색 띠). 체스판과 설명서가 같은 모양을 쓰도록 공용으로 사용 */
export default function PieceBody({ type, material }: PieceBodyProps) {
  const model = getPieceModel(type);
  const band = PIECE_BANDS[type];
  return (
    <>
      {model.parts.map((part, i) => (
        <mesh key={i} geometry={part.geometry} material={material} position={part.position} castShadow receiveShadow />
      ))}
      {band && <mesh geometry={band.geometry} material={band.material} position={[0, band.y, 0]} castShadow />}
    </>
  );
}
