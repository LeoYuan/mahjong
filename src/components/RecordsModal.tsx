import type { GameRecord } from '../types';

interface RecordsModalProps {
  records: GameRecord[];
  onClose: () => void;
  onClear: () => void;
}

export default function RecordsModal({ records, onClose, onClear }: RecordsModalProps) {
  if (records.length === 0) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }} onClick={onClose}>
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          borderRadius: 16,
          padding: 32,
          maxWidth: 600,
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          textAlign: 'center',
        }} onClick={e => e.stopPropagation()}>
          <h3 style={{ color: '#fbbf24', fontSize: 20, marginBottom: 16 }}>战绩记录</h3>
          <p style={{ color: '#94a3b8' }}>暂无战绩记录</p>
          <button
            onClick={onClose}
            style={{
              marginTop: 24,
              padding: '10px 24px',
              background: 'linear-gradient(145deg, #fbbf24, #f59e0b)',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        borderRadius: 16,
        padding: 24,
        maxWidth: 700,
        width: '95%',
        maxHeight: '85vh',
        overflow: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#fbbf24', fontSize: 20, margin: 0 }}>战绩记录</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClear}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #475569',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              清空记录
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                background: 'rgba(251,191,36,0.2)',
                color: '#fbbf24',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              关闭
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...records].reverse().map((record, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(30,41,59,0.6)',
                borderRadius: 12,
                padding: 16,
                border: '1px solid rgba(71,85,105,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14 }}>
                  第 {record.roundNumber} 局
                </span>
                <span style={{ color: record.isLuckyMode ? '#f472b6' : '#94a3b8', fontSize: 12 }}>
                  {record.isLuckyMode ? '🎲 手气模式' : '🎯 普通模式'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {record.players.map((p) => (
                  <div
                    key={p.playerIndex}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: p.isHu ? 'rgba(251,191,36,0.1)' : 'transparent',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#cbd5e1', fontSize: 14 }}>{p.name}</span>
                      {p.isHu && (
                        <span style={{ color: p.huType === 'zimo' ? '#f59e0b' : '#ef4444', fontSize: 12 }}>
                          {p.huPatterns?.join('·') || (p.huType === 'zimo' ? '自摸' : '胡')}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {p.scoreChange !== 0 && (
                        <span style={{
                          color: p.scoreChange > 0 ? '#22c55e' : '#ef4444',
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {p.scoreChange > 0 ? '+' : ''}{p.scoreChange}
                        </span>
                      )}
                      <span style={{ color: '#fbbf24', fontSize: 14, fontWeight: 700, minWidth: 50, textAlign: 'right' }}>
                        {p.finalScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <span style={{ color: '#64748b', fontSize: 11 }}>
                  {new Date(record.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
