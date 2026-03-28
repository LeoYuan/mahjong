import { useGameStore } from '../stores/gameStore';
import Tile from './Tile';
import type { Suit } from '../types';

interface QueYiPanelProps {
  onSelect: (suit: Suit) => void;
  hand: { suit: Suit; value: number; id: string }[];
}

const suitNames: Record<Suit, string> = {
  tong: '筒',
  tiao: '条',
  wan: '万',
};

const suitColors: Record<Suit, string> = {
  tong: 'text-red-500',
  tiao: 'text-green-500',
  wan: 'text-blue-500',
};

const suitBgColors: Record<Suit, string> = {
  tong: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50',
  tiao: 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50',
  wan: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50',
};

export default function QueYiPanel({ onSelect, hand }: QueYiPanelProps) {
  // 计算每门花色的数量
  const suitCount: Record<Suit, number> = { tong: 0, tiao: 0, wan: 0 };
  for (const tile of hand) {
    suitCount[tile.suit]++;
  }

  // 检查是否可以定缺（至少 3 张）
  const canSelect = (suit: Suit): boolean => suitCount[suit] >= 3;

  return (
    <div className="fixed inset-0 bg-slate-900/95 flex flex-col items-center justify-center z-50 p-4">
      <h2 className="text-2xl font-bold text-white mb-2">请选择定缺花色</h2>
      <p className="text-slate-400 mb-4">四川麻将必须缺一门才能胡牌</p>

      {/* 展示完整手牌 */}
      <div className="mb-6">
        <p className="text-slate-500 text-sm mb-2">你的手牌：</p>
        <div className="flex gap-1 justify-center overflow-x-auto">
          {hand.map((tile) => (
            <Tile key={tile.id} tile={tile} size="md" />
          ))}
        </div>
      </div>

      {/* 定缺选择 */}
      <div className="flex gap-4 justify-center mb-4">
        {(['tong', 'tiao', 'wan'] as Suit[]).map((suit) => {
          const isDisabled = !canSelect(suit);
          return (
            <button
              key={suit}
              onClick={() => !isDisabled && onSelect(suit)}
              disabled={isDisabled}
              data-testid={`queyi-${suit}`}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                isDisabled
                  ? 'bg-slate-700/30 border-slate-600/30 opacity-50 cursor-not-allowed'
                  : suitBgColors[suit]
              }`}
            >
              <span className={`text-4xl font-bold ${suitColors[suit]} mb-1 ${isDisabled ? 'grayscale' : ''}`}>
                {suitNames[suit]}
              </span>
              <span className={`text-sm ${isDisabled ? 'text-red-400' : 'text-slate-300'}`}>
                {suitCount[suit]} 张
                {isDisabled && ' (不足3张)'}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-slate-500 text-xs">
        手牌少于 3 张的花色不能被选为定缺
      </p>
    </div>
  );
}
