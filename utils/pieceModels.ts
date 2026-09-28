import * as THREE from 'three';
import { PieceType } from '../types';

export interface PiecePart {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
}

export interface PieceModel {
  parts: PiecePart[];
  radius: number; // 받침 반지름 (누웠을 때 바닥에서 뜨는 높이)
}

export const PIECE_COLORS = { white: '#efe4cf', black: '#2b2622' } as const;
export const MODEL_SCALE = 0.9;
// 누웠을 때 모든 말의 받침이 칸 중앙에서 같은 거리(화면 아래쪽)에 오도록 맞추는 기준선
export const LYING_BASELINE = 0.38;

// 기물 구분용 색 띠: 모델의 링 부분(아래 프로파일)을 살짝 덮는 원통
export interface PieceBand {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  y: number;
}
const bandMaterial = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
const bandGeometry = (radius: number, height: number) => new THREE.CylinderGeometry(radius, radius, height, 32);
export const PIECE_BANDS: Partial<Record<PieceType, PieceBand>> = {
  king: { geometry: bandGeometry(0.215, 0.04), material: bandMaterial('#38bdf8'), y: 0.485 }, // 목 띠 (반지름 0.21, 높이 0.47~0.50)
  queen: { geometry: bandGeometry(0.205, 0.04), material: bandMaterial('#ef4444'), y: 0.465 }, // 목 띠 (반지름 0.20, 높이 0.45~0.48)
  bishop: { geometry: bandGeometry(0.285, 0.05), material: bandMaterial('#22c55e'), y: 0.085 }, // 받침 띠 (반지름 0.27, 높이 0.07~0.10)
};

/** 논리 좌표(0~7) → 3D 월드 좌표. 1랭크가 화면 아래(+Z), 8랭크가 화면 위(-Z) */
export function squareToWorld(x: number, y: number): [number, number] {
  return [x - 3.5, 3.5 - y];
}

const SEGMENTS = 32;
const BASE_RADIUS = 0.31;
const BASE: [number, number][] = [
  [0, 0],
  [BASE_RADIUS, 0],
  [BASE_RADIUS, 0.04],
  [0.27, 0.07],
  [0.27, 0.1],
  [0.21, 0.14],
];

function lathe(profile: [number, number][]): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    SEGMENTS
  );
}

const sphere = (r: number) => new THREE.SphereGeometry(r, 20, 14);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

function knightHead(): THREE.BufferGeometry {
  // 말 머리 옆모습 실루엣 (왼쪽을 바라봄)
  const outline: [number, number][] = [
    [0.17, 0], [-0.17, 0], [-0.15, 0.1], [-0.08, 0.2], [-0.22, 0.27], [-0.27, 0.34],
    [-0.23, 0.41], [-0.08, 0.47], [-0.05, 0.56], [0, 0.63], [0.05, 0.54], [0.15, 0.47],
    [0.2, 0.3], [0.19, 0.12],
  ];
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.09);
  return geo;
}

function buildModel(type: PieceType): PieceModel {
  switch (type) {
    case 'pawn':
      return {
        parts: [
          { geometry: lathe([...BASE, [0.12, 0.34], [0.17, 0.36], [0.17, 0.39], [0.1, 0.41], [0, 0.42]]), position: [0, 0, 0] },
          { geometry: sphere(0.13), position: [0, 0.51, 0] },
        ],
        radius: BASE_RADIUS,
      };
    case 'rook': {
      const merlons: PiecePart[] = [
        [0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13],
      ].map(([x, z]) => ({ geometry: box(0.1, 0.08, 0.1), position: [x, 0.7, z] }));
      return {
        parts: [
          { geometry: lathe([...BASE, [0.17, 0.2], [0.16, 0.5], [0.22, 0.54], [0.22, 0.66], [0.15, 0.66], [0.15, 0.6], [0, 0.6]]), position: [0, 0, 0] },
          ...merlons,
        ],
        radius: BASE_RADIUS,
      };
    }
    case 'knight':
      return {
        parts: [
          { geometry: lathe([...BASE, [0.19, 0.18], [0, 0.18]]), position: [0, 0, 0] },
          { geometry: knightHead(), position: [0, 0.16, 0] },
        ],
        radius: BASE_RADIUS,
      };
    case 'bishop':
      return {
        parts: [
          {
            geometry: lathe([...BASE, [0.12, 0.36], [0.19, 0.39], [0.19, 0.42], [0.11, 0.44], [0.15, 0.52], [0.16, 0.6], [0.13, 0.68], [0.07, 0.74], [0, 0.76]]),
            position: [0, 0, 0],
          },
          { geometry: sphere(0.05), position: [0, 0.8, 0] },
        ],
        radius: BASE_RADIUS,
      };
    case 'queen': {
      const crown: PiecePart[] = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return { geometry: sphere(0.04), position: [Math.cos(a) * 0.2, 0.76, Math.sin(a) * 0.2] };
      });
      return {
        parts: [
          {
            geometry: lathe([...BASE, [0.12, 0.42], [0.2, 0.45], [0.2, 0.48], [0.12, 0.5], [0.19, 0.66], [0.22, 0.74], [0.13, 0.74], [0.13, 0.77], [0, 0.8]]),
            position: [0, 0, 0],
          },
          ...crown,
          { geometry: sphere(0.06), position: [0, 0.86, 0] },
        ],
        radius: BASE_RADIUS,
      };
    }
    case 'king':
      return {
        parts: [
          {
            geometry: lathe([...BASE, [0.13, 0.44], [0.21, 0.47], [0.21, 0.5], [0.13, 0.52], [0.19, 0.7], [0.21, 0.76], [0, 0.79]]),
            position: [0, 0, 0],
          },
          { geometry: box(0.06, 0.2, 0.06), position: [0, 0.88, 0] },
          { geometry: box(0.16, 0.06, 0.06), position: [0, 0.9, 0] },
        ],
        radius: BASE_RADIUS,
      };
  }
}

const cache = new Map<PieceType, PieceModel>();

export function getPieceModel(type: PieceType): PieceModel {
  let model = cache.get(type);
  if (!model) {
    model = buildModel(type);
    cache.set(type, model);
  }
  return model;
}
