import { useGameStore } from '../stores/gameStore';

const windNames = ['东', '南', '西', '北'];

export default function GameInfo() {
  const { gameState, players, currentUserIndex } = useGameStore();

  const remainingTiles = gameState.wall.length;
  const currentIdx = gameState.currentPlayerIndex;

  // 相对于自己的方位
  const getWind = (playerIdx: number) => {
    const relIdx = (playerIdx - currentUserIndex + 4) % 4;
    return windNames[relIdx];
  };

  return (
    <div className="center-disc">
      {/* 四方位标记 */}
      <span style={{ position: 'absolute', top: 8, fontSize: 12, color: currentIdx === (currentUserIndex + 2) % 4 ? '#fbbf24' : 'rgba(150,220,255,0.6)' }}>
        {getWind((currentUserIndex + 2) % 4)}
      </span>
      <span style={{ position: 'absolute', bottom: 8, fontSize: 12, color: currentIdx === currentUserIndex ? '#fbbf24' : 'rgba(150,220,255,0.6)' }}>
        {getWind(currentUserIndex)}
      </span>
      <span style={{ position: 'absolute', left: 10, fontSize: 12, color: currentIdx === (currentUserIndex + 1) % 4 ? '#fbbf24' : 'rgba(150,220,255,0.6)' }}>
        {getWind((currentUserIndex + 1) % 4)}
      </span>
      <span style={{ position: 'absolute', right: 10, fontSize: 12, color: currentIdx === (currentUserIndex + 3) % 4 ? '#fbbf24' : 'rgba(150,220,255,0.6)' }}>
        {getWind((currentUserIndex + 3) % 4)}
      </span>

      {/* 剩余牌数 */}
      <div style={{ fontSize: 28, fontWeight: 800, color: '#7dd3fc', lineHeight: 1 }}>
        {String(remainingTiles).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(150,220,255,0.5)', marginTop: 4 }}>
        剩余
      </div>
    </div>
  );
}
