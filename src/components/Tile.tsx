import type { Tile, Suit } from '../types';
import TileFace from './TileFace';

interface TileProps {
  tile?: Tile;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  selected?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  onClick?: () => void;
}

const sizes = {
  xs: { w: 28, h: 36, font: 11, subFont: 8, thick: 3 },
  sm: { w: 34, h: 44, font: 13, subFont: 9, thick: 4 },
  md: { w: 48, h: 64, font: 20, subFont: 12, thick: 6 },
  lg: { w: 58, h: 76, font: 24, subFont: 14, thick: 7 },
};

export default function TileComponent({
  tile,
  size = 'md',
  selected = false,
  disabled = false,
  hidden = false,
  onClick,
}: TileProps) {
  const s = sizes[size];

  // 牌背（绿色背面）
  if (hidden) {
    return (
      <div
        style={{
          width: s.w,
          height: s.h,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* 侧面厚度 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 1,
            right: 1,
            height: s.thick,
            background: 'linear-gradient(to bottom, #d4d0c8, #b8b4a8)',
            borderRadius: `0 0 ${Math.max(2, s.thick - 2)}px ${Math.max(2, s.thick - 2)}px`,
          }}
        />
        {/* 牌背绿色 */}
        <div
          style={{
            width: '100%',
            height: s.h - s.thick,
            background: 'linear-gradient(145deg, #2d8a4e 0%, #1a6b35 50%, #145a2c 100%)',
            borderRadius: Math.max(2, s.thick - 2),
            border: '1px solid #0f4d22',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 牌背花纹 */}
          <div
            style={{
              width: '65%',
              height: '65%',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 2,
              background: 'linear-gradient(145deg, rgba(255,255,255,0.05), transparent)',
            }}
          />
        </div>
      </div>
    );
  }

  if (!tile) return null;

  const faceW = s.w - 4; // SVG 绘制区域（去掉边框留白）
  const faceH = s.h - s.thick - 4;

  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      style={{
        width: s.w,
        height: s.h,
        position: 'relative',
        flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: selected ? `translateY(-${Math.round(s.h * 0.15)}px)` : 'translateY(0)',
        transition: 'transform 0.15s ease',
        background: 'none',
        border: 'none',
        padding: 0,
        outline: 'none',
      }}
    >
      {/* 选中高亮 */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: Math.max(3, s.thick - 1),
            border: '2px solid #fbbf24',
            boxShadow: '0 0 8px rgba(251,191,36,0.5)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      )}
      {/* 侧面厚度 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 1,
          right: 1,
          height: s.thick,
          background: 'linear-gradient(to bottom, #d4d0c8, #b8b4a8)',
          borderRadius: `0 0 ${Math.max(2, s.thick - 2)}px ${Math.max(2, s.thick - 2)}px`,
        }}
      />
      {/* 牌面白色 + SVG 图案 */}
      <div
        style={{
          width: '100%',
          height: s.h - s.thick,
          background: 'linear-gradient(145deg, #fafaf8 0%, #f0ede6 50%, #e8e4db 100%)',
          borderRadius: Math.max(2, s.thick - 2),
          border: '1px solid #ccc',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <TileFace suit={tile.suit} value={tile.value} width={faceW} height={faceH} />
      </div>
    </button>
  );
}
