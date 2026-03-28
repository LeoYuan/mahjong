import { useGameStore } from '../stores/gameStore';
import Player from './Player';
import ActionPanel from './ActionPanel';
import GameInfo from './GameInfo';
import QueYiPanel from './QueYiPanel';
import Tile from './Tile';
import RecordsModal from './RecordsModal';
import ConfettiCelebration from './ConfettiCelebration';
import type { Suit } from '../types';
import { useState } from 'react';

// 玩家信息卡片（放在牌桌四角）
function PlayerBadge({
  player,
  isCurrentTurn,
  style,
}: {
  player: { name: string; score: number; isDealer: boolean; isHu: boolean; huType?: 'zimo' | 'dianpao'; huPatterns?: string[]; huScore?: number; queYiSuit?: Suit };
  isCurrentTurn: boolean;
  style?: React.CSSProperties;
}) {
  const suitNames: Record<Suit, string> = { tong: '筒', tiao: '条', wan: '万' };
  const queYiColors: Record<Suit, string> = { tong: '#ef4444', tiao: '#22c55e', wan: '#3b82f6' };

  return (
    <div
      className={`player-card ${isCurrentTurn ? 'active' : ''}`}
      style={{
        zIndex: 10,
        ...(player.isHu ? {
          border: '2px solid #fbbf24',
          boxShadow: '0 0 12px rgba(251,191,36,0.5)',
          background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(30,41,59,0.95))',
        } : {}),
        ...style,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #475569, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {player.queYiSuit ? suitNames[player.queYiSuit].charAt(0) : '?'}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>
          {player.name}
          {player.isDealer && <span style={{ color: '#fbbf24', marginLeft: 3 }}>庄</span>}
          {player.isHu && (
            <span style={{ color: player.huType === 'zimo' ? '#f59e0b' : '#ef4444', marginLeft: 3 }}>
              {player.huPatterns ? player.huPatterns.join('·') : (player.huType === 'zimo' ? '自摸' : '胡')}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {Math.round(player.score)}
          {player.queYiSuit && (
            <span style={{ color: queYiColors[player.queYiSuit], marginLeft: 4, fontSize: 10, fontWeight: 400 }}>
              缺{suitNames[player.queYiSuit]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GameTable() {
  const {
    phase,
    players,
    gameState,
    currentUserIndex,
    tingTiles,
    startGame,
    startLuckyGame,
    resetGame,
    resetScores,
    luckyMode,
    discardTile,
    selectQueYi,
    gameRecords,
    clearRecords,
  } = useGameStore();

  // 所有 state 必须在组件顶部，不能在条件分支内
  const [showMore, setShowMore] = useState(false);
  const [showRecords, setShowRecords] = useState(false);

  // 等待开始
  if (phase === 'waiting') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        onClick={() => {
          if (showMore) setShowMore(false);
        }}
      >
        {/* 右上角更多按钮 */}
        <div
          style={{ position: 'absolute', top: 20, right: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowMore(!showMore)}
            style={{
              padding: '8px 16px',
              background: 'rgba(30,41,59,0.8)',
              color: '#94a3b8',
              border: '1px solid #475569',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            更多 ▼
          </button>
          {showMore && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              background: 'rgba(30,41,59,0.95)',
              borderRadius: 8,
              border: '1px solid #475569',
              overflow: 'hidden',
              minWidth: 120,
            }}>
              <button
                onClick={() => { setShowRecords(true); setShowMore(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  color: '#cbd5e1',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                📊 战绩查询
              </button>
              <button
                onClick={() => { resetScores(); setShowMore(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  color: '#cbd5e1',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                🔄 重置分数
              </button>
            </div>
          )}
        </div>

        {showRecords && (
          <RecordsModal
            records={gameRecords}
            onClose={() => setShowRecords(false)}
            onClear={() => { clearRecords(); setShowRecords(false); }}
          />
        )}

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: '#fbbf24', marginBottom: 16, textShadow: '0 2px 10px rgba(251,191,36,0.3)' }}>
            四川麻将
          </h1>
          <p style={{ fontSize: 16, color: '#94a3b8', marginBottom: 24 }}>血战到底 · 四人局</p>
          {/* 当前分数 */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 28 }}>
            {players.map((p) => (
              <div key={p.id} style={{
                padding: '6px 12px',
                background: 'rgba(30,41,59,0.6)',
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.name}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>{Math.round(p.score)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={startGame}
              style={{
                padding: '14px 48px',
                background: 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#1a1a2e',
                fontWeight: 700,
                fontSize: 18,
                borderRadius: 16,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(251,191,36,0.3)',
              }}
            >
              开始游戏
            </button>
            <button
              onClick={startLuckyGame}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(145deg, #f472b6 0%, #ec4899 100%)',
                color: 'white',
                fontWeight: 700,
                fontSize: 16,
                borderRadius: 16,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(236,72,153,0.3)',
              }}
            >
              手气模式
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 定缺阶段
  if (phase === 'queyi') {
    const selfPlayer = players[currentUserIndex];
    const aiQueYiDone = players.filter((_, i) => i !== currentUserIndex).every(p => p.queYiSuit);

    if (!selfPlayer.queYiSuit) {
      return <QueYiPanel onSelect={selectQueYi} hand={selfPlayer.hand} />;
    }

    if (!aiQueYiDone) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 16 }}>等待其他玩家定缺...</h2>
          </div>
        </div>
      );
    }

    return null;
  }

  // 游戏结束
  if (phase === 'finished') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* 手气模式撒花庆祝动画 */}
        <ConfettiCelebration active={luckyMode} duration={4000} />

        {/* 右上角战绩查询按钮 */}
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <button
            onClick={() => setShowRecords(true)}
            style={{
              padding: '10px 20px',
              background: 'rgba(30,41,59,0.8)',
              color: '#fbbf24',
              border: '1px solid #475569',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📊 战绩查询
          </button>
        </div>

        {showRecords && (
          <RecordsModal
            records={gameRecords}
            onClose={() => setShowRecords(false)}
            onClear={() => { clearRecords(); setShowRecords(false); }}
          />
        )}

        <div style={{ textAlign: 'center', background: 'rgba(30,41,59,0.8)', borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: luckyMode ? '#f472b6' : 'white', marginBottom: luckyMode ? 8 : 24 }}>
            {luckyMode ? '手气爆棚！' : '游戏结束'}
          </h2>
          {luckyMode && (
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
              本局不计分，纯属娱乐
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {players
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    padding: '10px 20px',
                    borderRadius: 12,
                    background: i === 0 ? 'rgba(251,191,36,0.15)' : 'transparent',
                    color: i === 0 ? '#fbbf24' : '#cbd5e1',
                    minWidth: 280,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{i === 0 ? '🏆 ' : ''}{p.name}</span>
                    {p.isHu && (
                      <span style={{ color: p.huType === 'zimo' ? '#f59e0b' : '#ef4444', fontSize: 12 }}>
                        {p.huPatterns ? p.huPatterns.join('·') : (p.huType === 'zimo' ? '自摸' : '胡')}
                      </span>
                    )}
                    {p.isHu && p.huScore && !luckyMode && (
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>
                        +{p.huScore * (p.huType === 'zimo' ? 3 : 1)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18 }}>{Math.round(p.score)}</span>
                </div>
              ))}
          </div>
          <button
            onClick={resetGame}
            style={{
              padding: '12px 36px',
              background: 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 100%)',
              color: '#1a1a2e',
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            再来一局
          </button>
        </div>
      </div>
    );
  }

  // ========== 游戏中 - 欢乐麻将风格 ==========
  const selfPlayer = players[currentUserIndex];
  const leftPlayer = players[(currentUserIndex + 1) % 4];
  const topPlayer = players[(currentUserIndex + 2) % 4];
  const rightPlayer = players[(currentUserIndex + 3) % 4];

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a1a', display: 'flex', flexDirection: 'column' }}>
      {/* 牌桌区域 */}
      <div
        className="mahjong-table"
        style={{
          flex: 1,
          margin: 4,
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 顶部 - 对家手牌 + 信息卡 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 8,
          paddingTop: 12,
          paddingBottom: 4,
        }}>
          <PlayerBadge
            player={topPlayer}
            isCurrentTurn={gameState.currentPlayerIndex === (currentUserIndex + 2) % 4}
            style={{}}
          />
          <Player
            player={topPlayer}
            position="top"
            isCurrentTurn={gameState.currentPlayerIndex === (currentUserIndex + 2) % 4}
            isSelf={false}
            tingTiles={[]}
          />
        </div>

        {/* 中间区域 */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          gap: 8,
          minHeight: 0,
        }}>
          {/* 中心信息面板 - 固定在正中央 */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
          }}>
            <GameInfo />
          </div>

          {/* 左家信息+牌墙 - 靠左边，垂直居中 */}
          <div style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}>
            <PlayerBadge
              player={leftPlayer}
              isCurrentTurn={gameState.currentPlayerIndex === (currentUserIndex + 1) % 4}
              style={{}}
            />
            <Player
              player={leftPlayer}
              position="left"
              isCurrentTurn={gameState.currentPlayerIndex === (currentUserIndex + 1) % 4}
              isSelf={false}
              tingTiles={[]}
            />
          </div>

          {/* 右家信息+牌墙 - 靠右边，垂直居中 */}
          <div style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}>
            <PlayerBadge
              player={rightPlayer}
              isCurrentTurn={gameState.currentPlayerIndex === (currentUserIndex + 3) % 4}
              style={{}}
            />
            <Player
              player={rightPlayer}
              position="right"
              isCurrentTurn={gameState.currentPlayerIndex === (currentUserIndex + 3) % 4}
              isSelf={false}
              tingTiles={[]}
            />
          </div>

          {/* 弃牌区 — 最后一张在 wait_action 时闪烁高亮 */}
          {([
            { player: topPlayer, playerIdx: (currentUserIndex + 2) % 4, style: { left: '50%', transform: 'translateX(-50%)', top: '10%' } as React.CSSProperties, maxW: 260, limit: 10 },
            { player: selfPlayer, playerIdx: currentUserIndex, style: { left: '50%', transform: 'translateX(-50%)', bottom: '10%' } as React.CSSProperties, maxW: 260, limit: 10 },
            { player: leftPlayer, playerIdx: (currentUserIndex + 1) % 4, style: { left: '25%', top: '50%', transform: 'translate(-50%, -50%)' } as React.CSSProperties, maxW: 80, limit: 8 },
            { player: rightPlayer, playerIdx: (currentUserIndex + 3) % 4, style: { right: '25%', top: '50%', transform: 'translate(50%, -50%)' } as React.CSSProperties, maxW: 80, limit: 8 },
          ]).map(({ player, playerIdx, style, maxW, limit }) => (
            <div key={playerIdx} style={{
              position: 'absolute',
              ...style,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
              justifyContent: 'center',
              maxWidth: maxW,
            }}>
              {player.discards.slice(-limit).map((tile, idx, arr) => {
                const isLast = idx === arr.length - 1
                  && gameState.lastDiscardPlayerIndex === playerIdx;
                return (
                  <div key={idx} className={isLast ? 'tile-highlight' : ''}>
                    <Tile tile={tile} size="sm" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 听牌提示 */}
        {tingTiles.length > 0 && (
          <div style={{
            textAlign: 'center',
            padding: '2px 0',
          }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 12px',
              background: 'rgba(251,191,36,0.2)',
              color: '#fbbf24',
              borderRadius: 12,
              fontSize: 12,
            }}>
              听牌: {tingTiles.map(t => `${t.value}${t.suit === 'tong' ? '筒' : t.suit === 'tiao' ? '条' : '万'}`).join(', ')}
            </span>
          </div>
        )}

        {/* 底部 - 自己信息卡 + 手牌 */}
        <div style={{
          padding: '4px 8px 8px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 8,
        }}>
          <PlayerBadge
            player={selfPlayer}
            isCurrentTurn={gameState.currentPlayerIndex === currentUserIndex}
            style={{ flexShrink: 0 }}
          />
          <Player
            player={selfPlayer}
            position="bottom"
            isCurrentTurn={gameState.currentPlayerIndex === currentUserIndex}
            isSelf={true}
            tingTiles={tingTiles}
            onTileClick={discardTile}
          />
        </div>
      </div>

      {/* 操作面板 */}
      <ActionPanel />
    </div>
  );
}
