export type SoundType = 'move' | 'capture' | 'check' | 'promote' | 'castle' | 'game-start' | 'game-end';

export const playSound = (type: SoundType) => {
  if (typeof window === 'undefined') return;
  const audio = new Audio(`/sounds/${type}.mp3`);
  // 재생 시 지연이나 겹침을 최소화하기 위해 현재 재생을 즉시 시작
  audio.play().catch((e) => {
    // 자동 재생 정책 등에 의해 막힐 수 있으므로 예외는 조용히 무시하거나 로깅
    console.debug('Sound play blocked or failed:', e);
  });
};
