import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
}

interface ConfettiCelebrationProps {
  active: boolean;
  duration?: number;
}

const colors = ['#fbbf24', '#f472b6', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#f59e0b'];

export default function ConfettiCelebration({ active, duration = 3000 }: ConfettiCelebrationProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    // 创建撒花
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 150; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const velocity = 5 + Math.random() * 10;
      newPieces.push({
        id: i,
        x: 50, // 从屏幕中心开始
        y: 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.8,
        velocityX: Math.cos(angle) * velocity,
        velocityY: Math.sin(angle) * velocity - 5, // 向上偏移
      });
    }
    setPieces(newPieces);

    // 动画更新
    let animationId: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        setPieces([]);
        return;
      }

      setPieces(prev => prev.map(p => ({
        ...p,
        x: p.x + p.velocityX * 0.5,
        y: p.y + p.velocityY * 0.5,
        velocityY: p.velocityY + 0.3, // 重力
        rotation: p.rotation + 5,
      })));

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [active, duration]);

  if (pieces.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: '10px',
            height: '10px',
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            opacity: p.y > 100 ? 0 : 1,
            transition: 'opacity 0.3s',
          }}
        />
      ))}
    </div>
  );
}
