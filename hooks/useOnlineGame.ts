'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Color, LastMove, Move, PieceState } from '../types';

// 장기(KoreanChess)와 같은 Supabase 프로젝트를 써도 방이 섞이지 않도록 체스 전용 채널 이름 사용
const LOBBY_CHANNEL = 'chess_lobby';
const roomChannelName = (roomId: string) => `chess-room-${roomId}`;
const roleStorageKey = (roomId: string) => `chess-role-${roomId}`;

export type OnlineRole = Color | 'spectator';

export interface LobbyRoom {
  roomId: string;
  roomName: string;
  playerCount: number;
}

export interface OnlineSnapshot {
  pieces: PieceState[];
  turn: Color;
  lastMove: LastMove | null;
  capturedPieces: PieceState[];
  gameOver: { type: 'checkmate'; winner: Color } | { type: 'stalemate' } | null;
}

interface OnlineHandlers {
  onRemoteMove: (move: Move) => void;
  onRemoteRestart: () => void;
  onSyncState: (snapshot: OnlineSnapshot) => void;
  getSnapshot: () => OnlineSnapshot;
}

interface PresenceUser {
  user_id: string;
  joined_at: number;
}

const generateUserId = () => Math.random().toString(36).substring(2, 9);
const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

function setRoomQuery(roomId: string | null) {
  const url = roomId ? `?room=${roomId}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

/**
 * 온라인 대전: 로비(방 목록) + 방 채널(수 주고받기)을 Supabase Realtime의 presence/broadcast로 처리.
 * 서버·DB 없이 브라우저끼리 상태를 주고받는 구조 (KoreanChess와 동일한 방식).
 */
export function useOnlineGame(enabled: boolean, handlers: OnlineHandlers) {
  const [myUserId] = useState(generateUserId);
  const [lobbyRooms, setLobbyRooms] = useState<LobbyRoom[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<OnlineRole | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const playerCountRef = useRef(0);

  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const lobbyChannelRef = useRef<RealtimeChannel | null>(null);
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const hostingRef = useRef<{ roomId: string; roomName: string } | null>(null);

  const trackLobby = useCallback(() => {
    const room = hostingRef.current;
    lobbyChannelRef.current
      ?.track(room ? { user_id: myUserId, isHosting: true, roomId: room.roomId, roomName: room.roomName, playerCount: playerCountRef.current || 1 } : { user_id: myUserId, isHosting: false })
      .catch(console.error);
  }, [myUserId]);

  /** 로비 채널에 broadcast로 방의 인원수 변경을 즉시 알림 */
  const broadcastRoomStatus = useCallback((targetRoomId: string, count: number) => {
    lobbyChannelRef.current?.send({
      type: 'broadcast',
      event: 'room_status',
      payload: { roomId: targetRoomId, playerCount: count },
    });
  }, []);

  // 온라인 모드를 "켜져 있다가" 벗어날 때만 방에서 나간 것으로 정리
  // (처음 페이지를 열 때 실행되면 초대 링크의 ?room= 을 읽기도 전에 지워버리므로)
  const wasEnabledRef = useRef(enabled);
  useEffect(() => {
    if (wasEnabledRef.current && !enabled) {
      hostingRef.current = null;
      setRoomId(null);
      setRoomName(null);
      if (new URLSearchParams(window.location.search).get('room')) setRoomQuery(null);
    }
    wasEnabledRef.current = enabled;
  }, [enabled]);

  // 로비 채널: 공개된 방 목록 공유 + broadcast로 인원수 실시간 업데이트
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;
    const channel = supabase.channel(LOBBY_CHANNEL, { config: { presence: { key: myUserId } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const rooms: LobbyRoom[] = [];
        Object.values(channel.presenceState()).forEach((presences) => {
          (presences as unknown as (LobbyRoom & { isHosting?: boolean })[]).forEach((p) => {
            if (p.isHosting && p.roomId && p.roomName) {
              rooms.push({ roomId: p.roomId, roomName: p.roomName, playerCount: p.playerCount || 1 });
            }
          });
        });
        setLobbyRooms(rooms);
      })
      // broadcast 이벤트로 인원수 실시간 수신: presence와 달리 즉시 반영됨
      .on('broadcast', { event: 'room_status' }, ({ payload }) => {
        setLobbyRooms((prev) =>
          prev.map((r) =>
            r.roomId === payload.roomId ? { ...r, playerCount: payload.playerCount } : r
          )
        );
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') trackLobby();
      });
    lobbyChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      lobbyChannelRef.current = null;
      setLobbyRooms([]);
    };
  }, [enabled, myUserId, trackLobby]);

  // 방 채널: 역할 배정 + 수/재시작/상태 동기화
  useEffect(() => {
    if (!enabled || !roomId || !isSupabaseConfigured) return;
    const channel = supabase.channel(roomChannelName(roomId), { config: { presence: { key: myUserId } } });
    const requestState = () => channel.send({ type: 'broadcast', event: 'request_state' });
    const currentRoomId = roomId; // 클로저 캡처

    channel
      .on('presence', { event: 'sync' }, () => {
        const users = (Object.values(channel.presenceState()).flat() as unknown as PresenceUser[]).sort(
          (a, b) => a.joined_at - b.joined_at
        );
        setPlayerCount(users.length);
        playerCountRef.current = users.length;

        // 방장이 로비 채널에 인원수 변경을 broadcast로 즉시 알림
        if (hostingRef.current?.roomId === currentRoomId) {
          broadcastRoomStatus(currentRoomId, users.length);
          // 뒤늦게 들어오는 사람을 위해 presence 상태도 업데이트
          setTimeout(() => trackLobby(), 0);
        }

        // 역할 결정: 새로고침 전 역할 > 방장(백) > 접속 순서(1번째 백, 2번째 흑, 이후 관전)
        let role = sessionStorage.getItem(roleStorageKey(currentRoomId)) as OnlineRole | null;
        if (!role && hostingRef.current?.roomId === currentRoomId) role = 'white';
        if (!role && users.length >= 2) {
          // 방장 정보와 내 정보가 모두 도착해야 순서를 판단할 수 있다
          const index = users.findIndex((u) => u.user_id === myUserId);
          if (index !== -1) role = index === 0 ? 'white' : index === 1 ? 'black' : 'spectator';
        }
        if (role) {
          sessionStorage.setItem(roleStorageKey(currentRoomId), role);
          const decided = role;
          setMyRole((prev) => prev ?? decided);
        }
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => handlersRef.current.onRemoteMove(payload.move))
      .on('broadcast', { event: 'restart' }, () => handlersRef.current.onRemoteRestart())
      .on('broadcast', { event: 'request_state' }, () => {
        channel.send({ type: 'broadcast', event: 'sync_state', payload: handlersRef.current.getSnapshot() });
      })
      .on('broadcast', { event: 'sync_state' }, ({ payload }) => handlersRef.current.onSyncState(payload))
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        await channel.track({ user_id: myUserId, joined_at: Date.now() });
        // 새로고침·재접속 시 방에 있는 사람에게 최신 판 상태를 요청
        setTimeout(requestState, 500);
      });
    roomChannelRef.current = channel;

    // 탭이 비활성화됐다 돌아오면 놓친 수가 있을 수 있으므로 재동기화
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestState();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
      roomChannelRef.current = null;
      setMyRole(null);
      setPlayerCount(0);
    };
  }, [enabled, roomId, myUserId, trackLobby, broadcastRoomStatus]);

  const createRoom = (roomName: string) => {
    const newRoomId = generateRoomId();
    hostingRef.current = { roomId: newRoomId, roomName };
    trackLobby();
    setRoomQuery(newRoomId);
    setRoomId(newRoomId);
    setRoomName(roomName);
  };

  const joinRoom = (targetRoomId: string, targetRoomName?: string) => {
    setRoomQuery(targetRoomId);
    setRoomId(targetRoomId);
    if (targetRoomName) setRoomName(targetRoomName);
  };

  const leaveRoom = () => {
    if (roomId) sessionStorage.removeItem(roleStorageKey(roomId));
    hostingRef.current = null;
    trackLobby();
    setRoomQuery(null);
    setRoomId(null);
    setRoomName(null);
  };

  const sendMove = (move: Move) => {
    roomChannelRef.current?.send({ type: 'broadcast', event: 'move', payload: { move } });
  };

  const sendRestart = () => {
    roomChannelRef.current?.send({ type: 'broadcast', event: 'restart' });
  };

  return {
    isConfigured: isSupabaseConfigured,
    lobbyRooms,
    roomId,
    roomName,
    myRole,
    playerCount,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMove,
    sendRestart,
  };
}
