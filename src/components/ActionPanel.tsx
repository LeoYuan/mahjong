import { useGameStore } from '../stores/gameStore';
import { canAnGang, canBuGang } from '../utils/mahjong';

export default function ActionPanel() {
  const {
    players,
    gameState,
    currentUserIndex,
    pengTile,
    gangTile,
    huTile,
    passAction,
  } = useGameStore();

  const actions = gameState.actions.filter(a => a.playerIndex === currentUserIndex);
  const canPeng = actions.some(a => a.type === 'peng');
  const canGang = actions.some(a => a.type === 'gang');
  const huAction = actions.find(a => a.type === 'hu');
  const canHu = !!huAction;
  const isZimo = canHu && !huAction?.targetTile;

  // 自己回合的主动操作（暗杠/补杠），但本回合已点过"过"则不再显示
  const isMyTurn = gameState.currentPlayerIndex === currentUserIndex && gameState.turnPhase === 'play';
  const myPlayer = players[currentUserIndex];
  const hasAnGang = isMyTurn && !gameState.passedGangThisTurn && !!canAnGang(myPlayer.hand);
  const hasBuGang = isMyTurn && !gameState.passedGangThisTurn && !!canBuGang(myPlayer.hand, myPlayer.melds);

  if (!canPeng && !canGang && !canHu && !hasAnGang && !hasBuGang) return null;

  return (
    <div className="fixed bottom-[35%] left-1/2 -translate-x-1/2 flex gap-3 z-50">
      {canHu && (
        <button
          onClick={huTile}
          className={`px-6 py-3 ${isZimo ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'} text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105 text-lg`}
        >
          {isZimo ? '自摸' : '胡'}
        </button>
      )}
      {canGang && (
        <button
          onClick={() => gangTile('ming')}
          className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105 text-lg"
        >
          杠
        </button>
      )}
      {hasAnGang && (
        <button
          onClick={() => gangTile('an')}
          className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105 text-lg"
        >
          暗杠
        </button>
      )}
      {hasBuGang && (
        <button
          onClick={() => gangTile('bu')}
          className="px-6 py-3 bg-purple-400 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105 text-lg"
        >
          补杠
        </button>
      )}
      {canPeng && (
        <button
          onClick={pengTile}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105 text-lg"
        >
          碰
        </button>
      )}
      <button
        onClick={passAction}
        className="px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105 text-lg"
      >
        过
      </button>
    </div>
  );
}
