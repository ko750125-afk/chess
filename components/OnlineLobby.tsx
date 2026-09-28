'use client';

import { useState } from 'react';
import type { LobbyRoom } from '../hooks/useOnlineGame';

interface OnlineLobbyProps {
  isConfigured: boolean;
  rooms: LobbyRoom[];
  onCreate: (roomName: string) => void;
  onJoin: (roomId: string, roomName: string) => void;
}

export default function OnlineLobby({ isConfigured, rooms, onCreate, onJoin }: OnlineLobbyProps) {
  const [roomName, setRoomName] = useState('');

  const create = () => {
    if (roomName.trim()) onCreate(roomName.trim());
  };

  if (!isConfigured) {
    return (
      <div className="w-full aspect-square max-h-[70vh] flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-700/40 border border-white/10 p-6 text-center">
        <p className="text-amber-300 font-bold text-lg">온라인 대전 설정이 필요합니다</p>
        <p className="text-neutral-300 text-sm">
          Supabase 연결 정보(<code>.env.local</code>)가 없어서 온라인 대전을 시작할 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-square max-h-[70vh] flex flex-col gap-4 rounded-xl bg-slate-700/40 border border-white/10 p-5 sm:p-8">
      <h2 className="text-2xl font-extrabold text-white">온라인 대기실</h2>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="방 이름을 입력하세요"
          value={roomName}
          maxLength={20}
          onChange={(e) => setRoomName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          className="flex-1 min-w-0 bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-400/60"
        />
        <button
          type="button"
          onClick={create}
          disabled={!roomName.trim()}
          className="px-5 rounded-lg font-bold bg-amber-500 text-neutral-900 hover:bg-amber-400 disabled:bg-slate-600 disabled:text-neutral-400 transition-colors cursor-pointer"
        >
          방 만들기
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto">
        <p className="text-sm font-bold text-neutral-300">입장 가능한 방 ({rooms.length})</p>
        {rooms.length === 0 ? (
          <p className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
            생성된 방이 없습니다. 새로운 방을 만들어 보세요!
          </p>
        ) : (
          rooms.map((room) => (
            <button
              key={room.roomId}
              type="button"
              onClick={() => onJoin(room.roomId, room.roomName)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-white/5 hover:border-amber-400/40 text-left transition-colors cursor-pointer"
            >
              <span>
                <span className="block font-bold text-white">{room.roomName}</span>
                {room.playerCount >= 2 && (
                  <span className="block text-xs font-semibold text-amber-400 mt-0.5">경기중입니다. (관전 가능)</span>
                )}
              </span>
              <span className={`px-3 py-1.5 rounded-md text-sm font-bold ${
                room.playerCount >= 2 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {room.playerCount >= 2 ? '관전하기' : '입장하기'}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
