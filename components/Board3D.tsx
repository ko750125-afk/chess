'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { PieceState, Position, Move, Color } from '../types';
import { squareToWorld } from '../utils/pieceModels';
import Piece3D from './Piece3D';
import SceneLights from './SceneLights';

interface Board3DProps {
  pieces: PieceState[];
  selectedId: string | null;
  legalMoves: Move[];
  lastMove: { from: Position; to: Position } | null;
  checkedColor: Color | null;
  threatPieceIds: string[];
  onSquareClick: (x: number, y: number) => void;
  flipped?: boolean; // 흑 플레이어 시점: 판을 180° 돌려서 흑이 아래에 오게 함
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
// 멀리서 좁은 화각으로 보면 원근 왜곡(가장자리 말이 바깥으로 밀려 보이는 현상)이 거의 사라진다
const CAMERA_HEIGHT = 36;
const FOV = 15;
// 카메라가 바로 위에서 보므로 바닥 평면은 화면에 균일한 비율로 투영된다 → 좌표 라벨을 HTML로 겹쳐 그림
const VISIBLE_UNITS = 2 * CAMERA_HEIGHT * Math.tan(((FOV / 2) * Math.PI) / 180);
const toPct = (v: number) => `${50 + (v / VISIBLE_UNITS) * 100}%`;
const LABEL_OFFSET = 4.29;

const noRaycast = () => null;

function SquareOverlay({ x, y, color, opacity, height }: { x: number; y: number; color: string; opacity: number; height: number }) {
  const [wx, wz] = squareToWorld(x, y);
  return (
    <mesh position={[wx, height, wz]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function PulsingOverlay({ x, y, color }: { x: number; y: number; color: string }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.opacity = 0.35 + 0.25 * Math.sin(clock.elapsedTime * 6);
  });
  const [wx, wz] = squareToWorld(x, y);
  return (
    <mesh position={[wx, 0.008, wz]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={matRef} color={color} transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
}

function MoveMarker({ x, y, isCapture }: { x: number; y: number; isCapture: boolean }) {
  const [wx, wz] = squareToWorld(x, y);
  return (
    <mesh position={[wx, 0.012, wz]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
      {isCapture ? <ringGeometry args={[0.38, 0.46, 32]} /> : <circleGeometry args={[0.14, 24]} />}
      <meshBasicMaterial color="#000000" transparent opacity={isCapture ? 0.45 : 0.35} depthWrite={false} />
    </mesh>
  );
}

/** 카메라의 화면 위쪽 방향을 바꿔 판을 180° 돌린다 (백 시점: -Z가 위, 흑 시점: +Z가 위) */
function CameraOrientation({ flipped }: { flipped: boolean }) {
  const { camera, invalidate, size } = useThree();
  useEffect(() => {
    camera.up.set(0, 0, flipped ? 1 : -1);
    camera.lookAt(0, 0, 0);
    
    if (camera instanceof THREE.PerspectiveCamera) {
      // 모바일(캔버스 너비 640 미만)에서는 좌표가 숨겨지므로, 빈 공간만큼(약 5%) 줌인하여 화면을 꽉 채움
      camera.zoom = size.width < 640 ? 1.05 : 1;
      camera.updateProjectionMatrix();
    }
    
    invalidate();
  }, [camera, flipped, invalidate, size.width]);
  return null;
}

function Scene({ pieces, selectedId, legalMoves, lastMove, checkedColor, threatPieceIds, onSquareClick, flipped = false }: Board3DProps) {
  const squareGeometry = useMemo(() => new THREE.BoxGeometry(1, 0.08, 1), []);
  const lightMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8cfa0', roughness: 0.7 }), []);
  const darkMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7a5236', roughness: 0.7 }), []);

  const selected = pieces.find((p) => p.id === selectedId);
  const checkedKing = checkedColor ? pieces.find((p) => p.type === 'king' && p.color === checkedColor) : undefined;
  const threatPieces = pieces.filter((p) => threatPieceIds.includes(p.id));

  const squares = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const [wx, wz] = squareToWorld(x, y);
      squares.push(
        <mesh
          key={`${x}-${y}`}
          geometry={squareGeometry}
          material={(x + y) % 2 === 0 ? darkMaterial : lightMaterial}
          position={[wx, -0.04, wz]}
          receiveShadow
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onSquareClick(x, y);
          }}
        />
      );
    }
  }

  return (
    <>
      <SceneLights shadowExtent={6} shadowMapSize={2048} />

      {/* 월넛 프레임 + 금박 테두리 */}
      <mesh position={[0, -0.17, 0]} receiveShadow>
        <boxGeometry args={[9, 0.3, 9]} />
        <meshStandardMaterial color="#3e2723" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[8.16, 0.3, 8.16]} />
        <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.35} />
      </mesh>

      {squares}

      {/* 마지막 이동 표시 제거됨 */}
      {selected && <SquareOverlay x={selected.x} y={selected.y} color="#fbbf24" opacity={0.45} height={0.006} />}
      {checkedKing && <PulsingOverlay x={checkedKing.x} y={checkedKing.y} color="#dc2626" />}
      {threatPieces.map((p) => (
        <PulsingOverlay key={`threat-${p.id}`} x={p.x} y={p.y} color="#f97316" />
      ))}
      {legalMoves.map((m) => (
        <MoveMarker
          key={`move-${m.to.x}-${m.to.y}`}
          x={m.to.x}
          y={m.to.y}
          isCapture={!!m.isEnPassant || pieces.some((p) => p.x === m.to.x && p.y === m.to.y)}
        />
      ))}

      {pieces.map((piece) => (
        <Piece3D
          key={piece.id}
          piece={piece}
          isSelected={piece.id === selectedId}
          isThreat={threatPieceIds.includes(piece.id)}
          onSelect={onSquareClick}
          flipped={flipped}
        />
      ))}
      <CameraOrientation flipped={flipped} />
    </>
  );
}

export default function Board3D(props: Board3DProps) {
  // 판이 돌아가면 좌표 라벨의 배치 순서도 반대로
  const axis = (v: number) => (props.flipped ? -v : v);
  return (
    <div className="relative w-full aspect-square rounded-lg sm:rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)] bg-[#2a1d17] cursor-pointer select-none">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, CAMERA_HEIGHT, 0], fov: FOV, up: [0, 0, -1], near: 1, far: 100 }}
      >
        <Scene {...props} />
      </Canvas>

      {/* 체스판 좌표 라벨 */}
      {FILES.map((file, x) => (
        <span
          key={file}
          className="absolute hidden sm:block -translate-x-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold text-[#f5deb3]/70 pointer-events-none"
          style={{ left: toPct(axis(squareToWorld(x, 0)[0])), top: toPct(LABEL_OFFSET) }}
        >
          {file}
        </span>
      ))}
      {Array.from({ length: 8 }, (_, y) => (
        <span
          key={y}
          className="absolute hidden sm:block -translate-x-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold text-[#f5deb3]/70 pointer-events-none"
          style={{ left: toPct(-LABEL_OFFSET), top: toPct(axis(squareToWorld(0, y)[1])) }}
        >
          {y + 1}
        </span>
      ))}
    </div>
  );
}
