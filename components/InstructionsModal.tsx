import PiecePreview3D from './PiecePreview3D';
import { PieceType } from '../types';

interface InstructionsModalProps {
  onClose: () => void;
  selectedType?: PieceType | null;
  isPracticeMode: boolean;
  onTogglePractice: () => void;
}

const PIECE_RULES: { type: PieceType; name: string; desc: string }[] = [
  {
    type: 'king',
    name: '킹 (King)',
    desc: '**한칸씩** 이동 __(대각선 가능)__',
  },
  {
    type: 'queen',
    name: '퀸 (Queen)',
    desc: '**한방향 무제한** 이동 __(대각선 가능)__',
  },
  {
    type: 'rook',
    name: '룩 (Rook)',
    desc: '**직선 무제한** 이동',
  },
  {
    type: 'bishop',
    name: '비숍 (Bishop)',
    desc: '**대각선 무제한** 이동',
  },
  {
    type: 'knight',
    name: '나이트 (Knight)',
    desc: "**한칸 직진 후 한칸 대각선** 이동 __(장애물이 있어도 통과함)__",
  },
  {
    type: 'pawn',
    name: '폰 (Pawn)',
    desc: '앞으로만 **한칸 전진** __(최초1회만 2칸도 가능)__ __공격은 대각선으로만 가능(후진불가)__',
  },
];

export default function InstructionsModal({ onClose, selectedType, isPracticeMode, onTogglePractice }: InstructionsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center lg:justify-end p-4 lg:pr-8 pointer-events-none animate-in fade-in duration-300">
      {/* 모달 래퍼 - 보물지도 펼쳐지는 애니메이션 */}
      <div className="relative pointer-events-auto w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-[6px] border-[#5c3a21] bg-gradient-to-br from-[#f5deb3] via-[#e6c280] to-[#d2b48c] animate-in slide-in-from-right-10 zoom-in-95 duration-500">
        
        {/* 양피지 텍스처 오버레이용 (가상의 이너 섀도우) */}
        <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(139,69,19,0.3)] pointer-events-none" />

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-[#5c3a21] text-[#f5deb3] font-bold shadow-lg hover:bg-[#3e2723] hover:scale-110 transition-transform"
        >
          ✕
        </button>

        <div className="relative z-0 p-4 sm:p-5 text-[#4e342e]">
          <div className="text-center mb-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-widest" style={{ textShadow: '2px 2px 4px rgba(139,69,19,0.4)' }}>
              설명서
            </h2>
          </div>

          {/* 기물 설명 그리드 (배열 순회) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {PIECE_RULES.map((rule) => {
              const isSelected = selectedType === rule.type;
              
              return (
                <div 
                  key={rule.type} 
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 text-center
                    ${isSelected 
                      ? 'border-[3px] border-[#39ff14] bg-white/50 shadow-[0_0_25px_rgba(57,255,20,0.7)] scale-[1.02] z-10' 
                      : 'border border-dashed border-[#8b4513]/40 bg-white/20 hover:bg-white/40'
                    }
                  `}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 mb-1 drop-shadow-xl flex items-center justify-center shrink-0">
                    <PiecePreview3D type={rule.type} color="white" className="w-full h-full" />
                  </div>
                  <h3 className={`text-base font-bold mb-0.5 ${isSelected ? 'text-[#1a7a0b]' : ''}`}>
                    {rule.name}
                  </h3>
                  <p className="text-xs sm:text-[13px] font-semibold opacity-90 leading-tight break-keep">
                    {rule.desc.split('**').map((part, i) => {
                      if (i % 2 === 1) {
                        return <strong key={i} className={isSelected ? 'text-[#1a7a0b]' : 'text-[#8b4513]'}>{part}</strong>;
                      }
                      return part.split('__').map((sub, j) => 
                        j % 2 === 1 ? <u key={`${i}-${j}`} className="decoration-red-600 decoration-2 underline-offset-2 font-bold text-red-900/90">{sub}</u> : sub
                      );
                    })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 특수 규칙 및 종료 규칙 영역 */}
          <div className="mt-4 p-3 bg-white/30 border-2 border-[#8b4513]/30 rounded-lg shadow-sm text-left flex flex-col gap-2">
            <div>
              <span className="font-bold text-sm text-[#8b4513]">
                ⭐ 특수 규칙 [프로모션]:
              </span>
              <span className="text-sm font-semibold ml-2 text-[#4e342e]">
                폰이 상대 진영 끝에 도달할 때마다 해당 폰을 다른 말(주로 퀸)로 <u className="decoration-red-600 decoration-2 underline-offset-2 font-bold text-red-900/90">업그레이드 가능</u>
              </span>
            </div>
            <div>
              <span className="font-bold text-sm text-[#8b4513]">
                ⭐ 종료 규칙 [체크메이트]:
              </span>
              <span className="text-sm font-semibold ml-2 text-[#4e342e]">
                상대의 킹이 공격을 피할 수도, 막을 수도 없는 상태가 되면 <u className="decoration-red-600 decoration-2 underline-offset-2 font-bold text-red-900/90">즉시 승리(게임 종료)</u>
              </span>
            </div>
          </div>

          {/* 하단 버튼 영역 */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {/* 연습 모드 토글 버튼 */}
            <button
              onClick={onTogglePractice}
              className={`px-4 py-2 font-bold text-sm sm:text-base rounded-lg transition-all ${
                isPracticeMode
                  ? 'bg-amber-500 text-neutral-900 shadow-[0_0_15px_#fbbf24] hover:bg-amber-400 scale-105'
                  : 'bg-[#8b4513]/20 text-[#8b4513] border border-[#8b4513]/50 hover:bg-[#8b4513]/40'
              }`}
            >
              {isPracticeMode ? '✨ 연습 모드 켜짐' : '연습해보기'}
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#5c3a21] text-[#f5deb3] font-bold text-sm sm:text-base rounded-lg shadow-md hover:bg-[#3e2723] hover:-translate-y-0.5 transition-all"
            >
              닫기
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
