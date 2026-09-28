'use client';

import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Color, PieceType } from '../types';
import { getPieceModel, PIECE_COLORS, MODEL_SCALE, LYING_BASELINE } from '../utils/pieceModels';
import PieceBody from './PieceBody';
import SceneLights from './SceneLights';

// 카드에 보여줄 범위 (체스판 한 칸 = 1). 칸 하나에 그림자가 살짝 삐져나온 정도까지 담는다
const VIEW_UNITS = 1.25;
// 그림자 선명도를 체스판(12칸 범위에 2048px)과 같게 맞춤
const SHADOW_EXTENT = 1.5;
const SHADOW_MAP_SIZE = Math.round((2048 / 12) * SHADOW_EXTENT * 2);

/** 카드 크기가 달라도 항상 VIEW_UNITS 범위가 꽉 차게 보이도록 정사영 카메라 배율 조정 */
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.zoom = Math.min(size.width, size.height) / VIEW_UNITS;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

interface PiecePreview3DProps {
  type: PieceType;
  color: Color;
  className?: string;
}

/** 설명서 카드용: 체스판 위의 말과 같은 자세(누움)·크기·조명·그림자로 바로 위에서 보여준다 */
export default function PiecePreview3D({ type, color, className = '' }: PiecePreview3DProps) {
  const model = getPieceModel(type);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PIECE_COLORS[color],
        roughness: 0.35,
        metalness: color === 'black' ? 0.2 : 0.05,
      }),
    [color]
  );
  useEffect(() => () => material.dispose(), [material]);

  return (
    <div className={className}>
      <Canvas
        shadows
        dpr={[1, 2]}
        orthographic
        camera={{ position: [0, 10, 0], up: [0, 0, -1], near: 0.1, far: 50, zoom: 40 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <FitCamera />
        <SceneLights shadowExtent={SHADOW_EXTENT} shadowMapSize={SHADOW_MAP_SIZE} />
        {/* Piece3D의 누운 상태와 같은 변환 */}
        <group
          position={[0, model.radius * MODEL_SCALE, LYING_BASELINE]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={MODEL_SCALE}
        >
          <PieceBody type={type} material={material} />
        </group>
        {/* 그림자만 받는 투명 바닥: 카드 배경은 그대로 보이고 체스판과 같은 방향으로 그림자만 생긴다 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3, 3]} />
          <shadowMaterial opacity={0.45} />
        </mesh>
      </Canvas>
    </div>
  );
}
