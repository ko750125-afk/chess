'use client';

interface SceneLightsProps {
  shadowExtent: number; // 그림자가 계산되는 범위(중심에서 가로·세로 거리)
  shadowMapSize: number; // 그림자 해상도 (범위에 비례해 주면 체스판과 같은 선명도)
}

/** 체스판과 설명서가 같은 조명(=같은 그림자 방향·세기)을 쓰도록 공용으로 사용 */
export default function SceneLights({ shadowExtent, shadowMapSize }: SceneLightsProps) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff6e5', '#3e2723', 0.35]} />
      <directionalLight
        position={[0, 15, 6]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.0004}
      />
    </>
  );
}
