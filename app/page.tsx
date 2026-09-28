'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import PromotionModal from '../components/PromotionModal';
import GameOverModal from '../components/GameOverModal';
import InstructionsModal from '../components/InstructionsModal';
import ChessPiece from '../components/ChessPiece';
import OnlineLobby from '../components/OnlineLobby';
import { useOnlineGame, OnlineSnapshot } from '../hooks/useOnlineGame';
import { getInitialSetup } from '../utils/initialSetup';
import {
  getLegalMoves,
  simulateMove,
  isCheckmate,
  isStalemate,
  isPromotionMove,
  toLastMove,
} from '../utils/engine';
import { isInCheck, getAttackers } from '../utils/rules';
import { playSound } from '../utils/sound';
import { PieceState, Color, Move, LastMove, PieceType } from '../types';

// WebGL(three.js)은 브라우저에서만 동작하므로 서버 렌더링에서 제외
const Board3D = dynamic(() => import('../components/Board3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-square rounded-lg sm:rounded-xl bg-[#2a1d17]" />
  ),
});

type GameOverResult = { type: 'checkmate'; winner: Color } | { type: 'stalemate' };
type Opponent = 'human' | 'ai' | 'online';

const AI_COLOR: Color = 'black';
const AI_DEPTH = 3;

export default function Home() {
  const [pieces, setPieces] = useState<PieceState[]>(() => getInitialSetup());
  const [turn, setTurn] = useState<Color>('white');
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [threatPieceIds, setThreatPieceIds] = useState<string[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<PieceState[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<Move | null>(null);
  const [gameOver, setGameOver] = useState<GameOverResult | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [opponent, setOpponent] = useState<Opponent>('human');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  const checkedColor: Color | null = gameOver ? null : isInCheck(pieces, turn) ? turn : null;
  const selectedPieceType = pieces.find(p => p.id === selectedId)?.type || null;

  // 비동기 콜백(Web Worker 등)에서 항상 최신 상태를 읽기 위한 참조
  const liveRef = useRef({ pieces, turn, lastMove, gameOver, opponent, isPracticeMode, capturedPieces });
  useEffect(() => {
    liveRef.current = { pieces, turn, lastMove, gameOver, opponent, isPracticeMode, capturedPieces };
  }, [pieces, turn, lastMove, gameOver, opponent, isPracticeMode, capturedPieces]);

  const finalizeMove = (move: Move) => {
    const { pieces: currentPieces, isPracticeMode: practiceNow } = liveRef.current;
    const mover = currentPieces.find((p) => p.id === move.pieceId);
    if (!mover) return;

    let captured: PieceState | undefined;
    if (move.isEnPassant) {
      const capturedY = mover.color === 'white' ? move.to.y - 1 : move.to.y + 1;
      captured = currentPieces.find((p) => p.x === move.to.x && p.y === capturedY);
    } else {
      captured = currentPieces.find((p) => p.x === move.to.x && p.y === move.to.y && p.id !== mover.id);
    }

    const next = simulateMove(currentPieces, move);
    const nextLastMove = toLastMove(move, mover);
    // 연습 모드 켜져 있으면 무조건 내 턴(white) 고정, 아니면 정상 교대
    const nextTurn: Color = practiceNow ? 'white' : (mover.color === 'white' ? 'black' : 'white');

    let over: GameOverResult | null = null;
    // 연습 모드에서는 게임 종료 판정을 비활성화 (자유 이동이 목적이므로)
    if (!practiceNow) {
      if (isCheckmate(next, nextTurn, nextLastMove)) {
        over = { type: 'checkmate', winner: mover.color };
      } else if (isStalemate(next, nextTurn, nextLastMove)) {
        over = { type: 'stalemate' };
      }
    }

    setPieces(next);
    setTurn(nextTurn);
    setLastMove(nextLastMove);
    setSelectedId(null);
    setLegalMoves([]);
    setPendingPromotion(null);
    if (captured) setCapturedPieces((prev) => [...prev, captured!]);
    if (over) setGameOver(over);

    // 사운드 재생 로직
    if (over) {
      playSound('game-end');
    } else if (isInCheck(next, nextTurn)) {
      playSound('check');
    } else if (move.promotion) {
      playSound('promote');
    } else if (captured) {
      playSound('capture');
    } else if (move.isCastle) {
      playSound('castle');
    } else {
      playSound('move');
    }
  };

  const resetBoard = () => {
    playSound('game-start');
    setPieces(getInitialSetup());
    setTurn('white');
    setLastMove(null);
    setSelectedId(null);
    setLegalMoves([]);
    setThreatPieceIds([]);
    setCapturedPieces([]);
    setPendingPromotion(null);
    setGameOver(null);
    setIsAiThinking(false);
  };

  // 온라인 대전: 상대의 수·재시작·판 상태를 받아 그대로 반영 (같은 규칙 엔진이라 결과가 동일)
  const online = useOnlineGame(opponent === 'online', {
    onRemoteMove: (move) => finalizeMove(move),
    onRemoteRestart: resetBoard,
    getSnapshot: (): OnlineSnapshot => {
      const { pieces, turn, lastMove, capturedPieces, gameOver } = liveRef.current;
      return { pieces, turn, lastMove, capturedPieces, gameOver };
    },
    onSyncState: (snapshot) => {
      setPieces(snapshot.pieces);
      setTurn(snapshot.turn);
      setLastMove(snapshot.lastMove);
      setCapturedPieces(snapshot.capturedPieces);
      setGameOver(snapshot.gameOver);
      setSelectedId(null);
      setLegalMoves([]);
      setThreatPieceIds([]);
      setPendingPromotion(null);
    },
  });

  // 초대 링크(?room=코드)로 들어오면 바로 온라인 방에 입장
  useEffect(() => {
    const invitedRoom = new URLSearchParams(window.location.search).get('room');
    if (invitedRoom) {
      setOpponent('online');
      online.joinRoom(invitedRoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 내가 둔 수: 적용하고, 온라인이면 상대에게도 전송 */
  const playMove = (move: Move) => {
    finalizeMove(move);
    if (opponent === 'online') online.sendMove(move);
  };

  // AI 워커 생성/정리 (대결 상대가 AI일 때만 유지)
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => {
    if (opponent !== 'ai') {
      workerRef.current?.terminate();
      workerRef.current = null;
      return;
    }

    const worker = new Worker(new URL('./ai.worker.ts', import.meta.url));
    worker.onmessage = (e: MessageEvent) => {
      setIsAiThinking(false);
      const { opponent: liveOpponent, turn: liveTurn, gameOver: liveGameOver } = liveRef.current;
      // 그 사이 모드가 바뀌었거나 게임이 끝났거나 더 이상 AI 턴이 아니면 무시
      if (liveOpponent !== 'ai' || liveGameOver || liveTurn !== AI_COLOR) return;

      if (e.data.type === 'SUCCESS' && e.data.result) {
        finalizeMove(e.data.result.move);
      } else if (e.data.type === 'ERROR') {
        console.error('AI Error:', e.data.error);
      }
    };
    workerRef.current = worker;

    return () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [opponent]);

  // AI 차례가 되면 워커에 연산 요청
  useEffect(() => {
    if (opponent !== 'ai' || gameOver || pendingPromotion) return;
    if (turn !== AI_COLOR) return;

    setIsAiThinking(true);
    const timer = setTimeout(() => {
      workerRef.current?.postMessage({ pieces, depth: AI_DEPTH, aiColor: AI_COLOR, lastMove });
    }, 1000); // AI가 1초 대기 후 수를 둠 (자연스러운 체감 속도)

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponent, turn, gameOver, pendingPromotion]);

  const handleSquareClick = (x: number, y: number) => {
    if (gameOver || pendingPromotion) return;
    if (opponent === 'ai' && (turn === AI_COLOR || isAiThinking)) return; // AI 턴에는 조작 불가
    // 온라인: 상대가 들어와 있고 내 차례일 때만 조작 가능 (관전자는 조작 불가)
    if (opponent === 'online' && (online.playerCount < 2 || online.myRole !== turn)) return;

    if (selectedId) {
      const move = legalMoves.find((m) => m.to.x === x && m.to.y === y);
      if (move) {
        const mover = pieces.find((p) => p.id === selectedId)!;
        if (isPromotionMove(mover, move.to)) {
          setPendingPromotion(move);
        } else {
          playMove(move);
        }
        setThreatPieceIds([]);
        return;
      }

      // 킹이 선택된 상태에서 이동 불가 칸 클릭 시, 해당 칸을 위협하는 적 기물을 하이라이트
      const selectedPiece = pieces.find((p) => p.id === selectedId);
      if (selectedPiece && selectedPiece.type === 'king') {
        const dx = Math.abs(x - selectedPiece.x);
        const dy = Math.abs(y - selectedPiece.y);
        // 킹의 이동 범위(인접 1칸) 안의 빈 칸이면
        if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
          const occupant = pieces.find((p) => p.x === x && p.y === y);
          if (!occupant || occupant.color !== turn) {
            const enemy: Color = turn === 'white' ? 'black' : 'white';
            const attackers = getAttackers(pieces, x, y, enemy);
            if (attackers.length > 0) {
              setThreatPieceIds(attackers);
              return;
            }
          }
        }
      }
    }

    setThreatPieceIds([]);
    const piece = pieces.find((p) => p.x === x && p.y === y);
    if (piece && piece.color === turn) {
      setSelectedId(piece.id);
      setLegalMoves(getLegalMoves(piece, pieces, lastMove));
    } else {
      setSelectedId(null);
      setLegalMoves([]);
    }
  };

  const handlePromotionChoose = (type: PieceType) => {
    if (!pendingPromotion) return;
    playMove({ ...pendingPromotion, promotion: type });
  };

  const handleRestart = () => {
    if (opponent === 'online' && online.myRole === 'spectator') return; // 관전자는 판을 초기화할 수 없음
    resetBoard();
    if (opponent === 'online') online.sendRestart();
  };

  const handleSetOpponent = (mode: Opponent) => {
    if (mode === opponent) return;
    setOpponent(mode);
    if (mode !== 'human') setIsPracticeMode(false);
    resetBoard();
  };

  const handleLeaveRoom = () => {
    online.leaveRoom();
    resetBoard();
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('방 주소가 복사되었습니다! 친구에게 전달하세요.');
  };

  const capturedBy = (color: Color) => capturedPieces.filter((p) => p.color !== color);

  const isOnlineLobby = opponent === 'online' && !online.roomId;
  const isSpectator = opponent === 'online' && online.myRole === 'spectator';
  // 온라인에서 흑을 맡으면 판을 돌려 흑이 아래에 오게 함
  const myColor: Color = opponent === 'online' && online.myRole === 'black' ? 'black' : 'white';
  const turnLabel = isSpectator
    ? turn === 'white' ? '백' : '흑'
    : turn === myColor ? '나' : opponent === 'ai' ? 'AI' : '상대';
  const opponentColor: Color = myColor === 'white' ? 'black' : 'white';

  const getCardStyle = (ownerColor: Color) => {
    if (ownerColor === 'black') {
      return {
        bg: 'bg-gradient-to-br from-[#795548] to-[#4e342e]',
        border: 'border-[#5c3a21]',
        text: 'text-[#f5deb3]',
        emptyText: 'text-[#f5deb3]/50',
      };
    } else {
      return {
        bg: 'bg-gradient-to-br from-[#f5deb3] to-[#d2b48c]',
        border: 'border-[#d4c4a8]',
        text: 'text-[#4e342e]',
        emptyText: 'text-[#4e342e]/50',
      };
    }
  };

  const opponentStyle = getCardStyle(opponentColor);
  const myStyle = getCardStyle(myColor);

  return (
    <main className="w-full h-[100dvh] bg-slate-800 flex flex-col items-center justify-center p-1 sm:p-4 select-none overflow-hidden">
      <div className="w-full max-w-[min(calc(100dvh-260px),98vw)] sm:max-w-[min(82vh,94vw)] lg:max-w-[820px] flex flex-col items-center gap-1.5 sm:gap-2">
        {/* 게임 타이틀 및 로고 */}
        <div className="w-full flex items-center justify-center gap-3 py-2">
          <img src="/chess_icon_wood.jpg" alt="Chess Logo" className="w-12 h-12 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.4)] border border-[#d4c4a8]/50 object-cover" />
          <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-[#f5deb3] to-[#d2b48c] bg-clip-text text-transparent drop-shadow-md tracking-wider">CHESS MASTER</h1>
        </div>

        {/* 대결 상대 선택 */}
        <div className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-700/30 rounded-xl border border-white/5">
          <button
            onClick={() => handleSetOpponent('human')}
            type="button"
            className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              opponent === 'human'
                ? 'bg-amber-500 text-neutral-900 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            로컬 2인 대전
          </button>
          <button
            onClick={() => handleSetOpponent('ai')}
            type="button"
            className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              opponent === 'ai'
                ? 'bg-amber-500 text-neutral-900 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            AI와 대결
          </button>
          <button
            onClick={() => handleSetOpponent('online')}
            type="button"
            className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              opponent === 'online'
                ? 'bg-amber-500 text-neutral-900 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            온라인 대전
          </button>
        </div>

        {/* 온라인 방 정보: 방 코드, 내 역할, 상대 대기, 링크 복사, 나가기 */}
        {opponent === 'online' && online.roomId && (
          <div className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-blue-900/30 rounded-xl border border-blue-400/20 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-neutral-200">
              <span className="font-bold">
                {online.myRole === 'white' ? '나: 백' : online.myRole === 'black' ? '나: 흑' : online.myRole === 'spectator' ? '관전 중' : '접속 중…'}
              </span>
              {online.playerCount < 2 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600/80 text-white font-bold animate-pulse">
                  상대를 기다리는 중…
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyRoomLink}
                className="px-3 py-1 rounded-lg border border-white/10 text-neutral-200 hover:bg-white/10 cursor-pointer"
              >
                링크 복사
              </button>
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="px-3 py-1 rounded-lg border border-red-400/30 text-red-300 hover:bg-red-500/20 cursor-pointer"
              >
                나가기
              </button>
            </div>
          </div>
        )}

        {/* 상단 통합 헤더: 턴 인디케이터 + 체크 알림 + 재시작 버튼 */}
        <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/50 rounded-xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center bg-black/40 rounded-lg p-0.5 border border-white/5">
              <ChessPiece type="pawn" color={turn} isTight className="w-full h-full" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 text-xs sm:text-sm">현재 턴:</span>
              <span
                className={`font-bold text-sm sm:text-base ${
                  turn === myColor ? 'text-amber-100' : 'text-neutral-200'
                }`}
              >
                {turnLabel}
              </span>
            </div>
            {opponent === 'ai' && isAiThinking && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-600/80 text-white font-extrabold text-xs animate-pulse shadow-md">
                AI 생각 중…
              </span>
            )}
            {isPracticeMode && (
              <span className="px-2 py-0.5 rounded border border-amber-400 bg-amber-400/20 text-amber-300 font-extrabold text-xs shadow-md">
                연습 모드 켜짐 (무한 턴)
              </span>
            )}
            {checkedColor && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-xs animate-bounce shadow-md">
                체크!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { playSound('move'); setShowInstructions(true); }}
              type="button"
              className="text-amber-200 hover:text-amber-100 px-3.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-900/40 hover:bg-amber-800/60 active:scale-95 transition-all text-xs sm:text-sm font-bold cursor-pointer shadow-[0_0_10px_rgba(212,175,55,0.2)]"
            >
              🗺️ 설명서
            </button>
            <button
              onClick={handleRestart}
              disabled={isSpectator || isOnlineLobby}
              type="button"
              className="text-neutral-300 hover:text-white px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-xs sm:text-sm font-semibold cursor-pointer"
            >
              새 게임
            </button>
          </div>
        </div>

        {/* 상대 플레이어 획득 기물 */}
        <div className={`w-full min-h-7 px-3 py-1 ${opponentStyle.bg} rounded-lg border ${opponentStyle.border} shadow-[inset_0_0_8px_rgba(0,0,0,0.4)] flex items-center gap-1.5 overflow-x-auto transition-colors`}>
          <span className={`text-[11px] font-bold ${opponentStyle.text} shrink-0 mr-1.5`}>잡은 말:</span>
          {capturedBy(opponentColor).length === 0 ? (
            <span className={`text-[11px] ${opponentStyle.emptyText}`}>-</span>
          ) : (
            capturedBy(opponentColor).map((p, idx) => (
              <div key={`${p.id}-${idx}`} className="w-6 h-6 shrink-0 flex items-center justify-center">
                <ChessPiece type={p.type} color={p.color} isTight className="w-full h-full max-h-5" />
              </div>
            ))
          )}
        </div>

        {/* 메인 체스보드 */}
        <div className="relative w-full flex items-center justify-center">
          {isOnlineLobby ? (
            <OnlineLobby
              isConfigured={online.isConfigured}
              rooms={online.lobbyRooms}
              onCreate={online.createRoom}
              onJoin={online.joinRoom}
            />
          ) : (
            <Board3D
              pieces={pieces}
              selectedId={selectedId}
              legalMoves={legalMoves}
              lastMove={lastMove}
              checkedColor={checkedColor}
              threatPieceIds={threatPieceIds}
              onSquareClick={handleSquareClick}
              flipped={myColor === 'black'}
            />
          )}

          {pendingPromotion && <PromotionModal color={turn} onChoose={handlePromotionChoose} />}
          {gameOver && <GameOverModal result={gameOver} onRestart={handleRestart} />}
          {showInstructions && (
            <InstructionsModal 
              onClose={() => setShowInstructions(false)} 
              selectedType={selectedPieceType}
              isPracticeMode={isPracticeMode}
              onTogglePractice={() => {
                setIsPracticeMode((prev) => {
                  const nextMode = !prev;
                  if (nextMode) {
                    setOpponent('human');
                    setTurn('white'); // 연습 모드를 켤 때 무조건 내 턴으로 강제 복귀
                  }
                  return nextMode;
                });
              }}
            />
          )}
        </div>

        {/* 나 플레이어 획득 기물 */}
        <div className={`w-full min-h-7 px-3 py-1 ${myStyle.bg} rounded-lg border ${myStyle.border} shadow-[inset_0_0_8px_rgba(0,0,0,0.4)] flex items-center gap-1.5 overflow-x-auto transition-colors`}>
          <span className={`text-[11px] font-bold ${myStyle.text} shrink-0 mr-1.5`}>잡은 말:</span>
          {capturedBy(myColor).length === 0 ? (
            <span className={`text-[11px] ${myStyle.emptyText}`}>-</span>
          ) : (
            capturedBy(myColor).map((p, idx) => (
              <div key={`${p.id}-${idx}`} className="w-6 h-6 shrink-0 flex items-center justify-center">
                <ChessPiece type={p.type} color={p.color} isTight className="w-full h-full max-h-5" />
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
