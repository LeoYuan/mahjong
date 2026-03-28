/**
 * 麻将牌面图案 — 使用 FluffyStuff/riichi-mahjong-tiles 素材
 */
import type { Suit } from '../types';

interface TileFaceProps {
  suit: Suit;
  value: number;
  width: number;
  height: number;
}

const suitPrefix: Record<Suit, string> = {
  tong: 'Pin',
  tiao: 'Sou',
  wan: 'Man',
};

export default function TileFace({ suit, value, width, height }: TileFaceProps) {
  const src = `/tiles/${suitPrefix[suit]}${value}.svg`;
  const scale = 0.8;
  return (
    <img
      src={src}
      alt={`${suit}${value}`}
      width={width * scale}
      height={height * scale}
      style={{ display: 'block', objectFit: 'contain' }}
      draggable={false}
    />
  );
}
