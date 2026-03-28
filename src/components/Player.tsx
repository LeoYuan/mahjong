import Tile from './Tile';
import type { Player as PlayerType, Suit } from '../types';

interface PlayerProps {
  player: PlayerType;
  position: 'bottom' | 'left' | 'top' | 'right';
  isCurrentTurn: boolean;
  isSelf: boolean;
  tingTiles: { suit: string; value: number }[];
  onTileClick?: (tileId: string) => void;
}

const suitNames: Record<Suit, string> = {
  tong: '筒',
  tiao: '条',
  wan: '万',
};

const queYiColors: Record<Suit, string> = {
  tong: '#ef4444',
  tiao: '#22c55e',
  wan: '#3b82f6',
};

function PlayerBadge({ player, isCurrentTurn, compact = false }: { player: PlayerType; isCurrentTurn: boolean; compact?: boolean }) {
  return (
    <div className={`player-card ${isCurrentTurn ? 'active' : ''}`}>
      {/* 头像占位 */}
      <div
        style={{
          width: compact ? 28 : 36,
          height: compact ? 28 : 36,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #475569, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: compact ? 14 : 18,
          flexShrink: 0,
        }}
      >
        {player.queYiSuit ? suitNames[player.queYiSuit].charAt(0) : '?'}
      </div>
      <div>
        <div style={{ fontSize: compact ? 10 : 12, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>
          {player.name}
          {player.isDealer && <span style={{ color: '#fbbf24', marginLeft: 4 }}>庄</span>}
          {player.isHu && (
            <span style={{ color: player.huType === 'zimo' ? '#f59e0b' : '#ef4444', marginLeft: 4 }}>
              {player.huPatterns ? player.huPatterns.join('·') : (player.huType === 'zimo' ? '自摸' : '胡')}
            </span>
          )}
        </div>
        <div style={{ fontSize: compact ? 9 : 11, color: '#94a3b8' }}>
          {Math.round(player.score)}
          {player.queYiSuit && (
            <span style={{ color: queYiColors[player.queYiSuit], marginLeft: 4 }}>
              缺{suitNames[player.queYiSuit]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Player({ player, position, isCurrentTurn, isSelf, tingTiles, onTileClick }: PlayerProps) {
  // 底部（自己）
  if (position === 'bottom') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* 碰/杠的牌 */}
        {player.melds.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {player.melds.map((meld, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 1 }}>
                {meld.tiles.map((tile, tidx) => (
                  <Tile
                    key={tidx}
                    tile={tile}
                    size="sm"
                    hidden={meld.type === 'angang' && tidx < 3}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 手牌 */}
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }} data-testid="player-hand">
          {player.hand.map((tile) => {
            const isTing = tingTiles.some(t => t.suit === tile.suit && t.value === tile.value);
            return (
              <div key={tile.id} style={{ position: 'relative' }}>
                {isTing && (
                  <div style={{
                    position: 'absolute',
                    top: -4,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 6,
                    height: 6,
                    background: '#fbbf24',
                    borderRadius: '50%',
                    zIndex: 1,
                  }} />
                )}
                <Tile tile={tile} size="lg" onClick={() => onTileClick?.(tile.id)} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 顶部（对面）
  if (position === 'top') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* 手牌背面 */}
        <div style={{ display: 'flex', gap: 1 }}>
          {Array.from({ length: player.hand.length }).map((_, idx) => (
            <Tile key={idx} size="sm" hidden />
          ))}
        </div>
        {/* 碰/杠 */}
        {player.melds.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {player.melds.map((meld, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 1 }}>
                {meld.tiles.map((tile, tidx) => (
                  <Tile key={tidx} tile={tile} size="xs" hidden={meld.type === 'angang' && tidx < 3} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 左侧 / 右侧 — 双列网格显示手牌背面
  const sideHandCount = Math.min(player.hand.length, 13);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {/* 手牌背面 - 双列网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, auto)',
        gap: 2,
      }}>
        {Array.from({ length: sideHandCount }).map((_, idx) => (
          <Tile key={idx} size="xs" hidden />
        ))}
      </div>
      {/* 碰/杠 */}
      {player.melds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {player.melds.map((meld, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 1 }}>
              {meld.tiles.map((tile, tidx) => (
                <Tile key={tidx} tile={tile} size="xs" hidden={meld.type === 'angang' && tidx < 3} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
