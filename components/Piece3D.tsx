'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { PieceState } from '../types';
import { getPieceModel, squareToWorld, PIECE_COLORS, MODEL_SCALE, LYING_BASELINE } from '../utils/pieceModels';
import PieceBody from './PieceBody';

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

interface Piece3DProps {
  piece: PieceState;
  isSelected: boolean;
  isThreat: boolean;
  onSelect: (x: number, y: number) => void;
  flipped: boolean;
}

export default function Piece3D({ piece, isSelected, isThreat, onSelect, flipped }: Piece3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const model = getPieceModel(piece.type);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PIECE_COLORS[piece.color],
        roughness: 0.35,
        metalness: piece.color === 'black' ? 0.2 : 0.05,
      }),
    [piece.color]
  );
  useEffect(() => () => material.dispose(), [material]);

  const [targetX, targetZ] = squareToWorld(piece.x, piece.y);

  // stand: 0=누움, 1=섬 / t: 이동 진행도(1이면 도착) / wobble: 선택 시 살랑거림 강도
  const anim = useRef({ fromX: targetX, fromZ: targetZ, toX: targetX, toZ: targetZ, t: 1, duration: 0.4, stand: 0, wobble: 0 });

  useEffect(() => {
    const a = anim.current;
    if (a.toX === targetX && a.toZ === targetZ) return;
    // 이동 중에 목적지가 또 바뀌어도 현재 보이는 위치에서 자연스럽게 다시 출발
    const e = easeInOut(a.t);
    a.fromX += (a.toX - a.fromX) * e;
    a.fromZ += (a.toZ - a.fromZ) * e;
    a.toX = targetX;
    a.toZ = targetZ;
    a.t = 0;
    a.duration = Math.min(0.28 + Math.hypot(a.toX - a.fromX, a.toZ - a.fromZ) * 0.07, 0.7);
  }, [targetX, targetZ]);

  useFrame((state, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const a = anim.current;
    const moving = a.t < 1;
    const time = state.clock.elapsedTime;

    // 이동할 때는 먼저 일어선 뒤 출발하고, 도착하면 (선택 해제 상태라면) 다시 눕는다
    if (moving) {
      a.stand = THREE.MathUtils.damp(a.stand, 1, 16, dt);
      if (a.stand > 0.9) a.t = Math.min(1, a.t + dt / a.duration);
    } else {
      a.stand = THREE.MathUtils.damp(a.stand, isSelected ? 1 : 0, 9, dt);
    }
    a.wobble = THREE.MathUtils.damp(a.wobble, isSelected && !moving ? 1 : 0, 8, dt);

    const e = easeInOut(a.t);
    const x = a.fromX + (a.toX - a.fromX) * e;
    const z = a.fromZ + (a.toZ - a.fromZ) * e;
    const arc = moving ? Math.sin(Math.PI * e) * (piece.type === 'knight' ? 0.9 : 0.35) : 0;
    const lie = 1 - a.stand;
    const hop = Math.sin(Math.PI * a.stand) * 0.12;
    const bob = Math.sin(time * 4) * 0.03 * a.wobble;

    // 누울 때는 받침을 축으로 머리가 화면 위쪽을 향하도록 눕히고, 받침을 공통 기준선에 맞춤
    // (판이 돌아간 흑 시점에서는 화면 위쪽이 +Z이므로 방향을 반대로)
    const facing = flipped ? -1 : 1;
    g.position.set(x, model.radius * MODEL_SCALE * lie + hop + arc + bob, z + LYING_BASELINE * lie * facing);
    // YXZ 순서: 먼저 눕힌(X) 뒤 세로축(Y)으로 돌려야 머리 방향이 뒤집힌다
    g.rotation.set((-Math.PI / 2) * lie, (flipped ? Math.PI : 0) + Math.sin(time * 2) * 0.15 * a.wobble, 0, 'YXZ');

    if (isThreat) {
      material.emissive.set('#ff3300');
      material.emissiveIntensity = 0.35 + 0.25 * Math.sin(time * 6);
    } else if (isSelected) {
      material.emissive.set('#ffb000');
      material.emissiveIntensity = 0.18;
    } else {
      material.emissiveIntensity = 0;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(piece.x, piece.y);
  };

  return (
    <group ref={groupRef} scale={MODEL_SCALE} onClick={handleClick}>
      <PieceBody type={piece.type} material={material} />
    </group>
  );
}
