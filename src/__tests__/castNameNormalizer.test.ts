import { describe, it, expect } from 'vitest';
import { normalizeCastName, findCastMasterByNormalizedName } from '../utils/castNameNormalizer';

describe('normalizeCastName', () => {
  it('前後の空白を除去する', () => {
    expect(normalizeCastName('  さくら  ')).toBe('さくら');
  });

  it('連続した空白を1つにまとめる', () => {
    expect(normalizeCastName('さくら   ちゃん')).toBe('さくら ちゃん');
  });

  it('先頭のアンダースコアを除去する', () => {
    expect(normalizeCastName('_さくら')).toBe('さくら');
  });

  it('先頭のハイフンを除去する', () => {
    expect(normalizeCastName('-さくら')).toBe('さくら');
  });

  it('先頭の中点（・）を除去する', () => {
    expect(normalizeCastName('・さくら')).toBe('さくら');
  });

  it('先頭の複数記号を連続除去する', () => {
    expect(normalizeCastName('_-さくら')).toBe('さくら');
  });

  it('空文字は空文字を返す', () => {
    expect(normalizeCastName('')).toBe('');
  });

  it('記号だけの文字列は空文字になる', () => {
    expect(normalizeCastName('___')).toBe('');
  });

  it('通常の名前はそのまま返す', () => {
    expect(normalizeCastName('さくら')).toBe('さくら');
  });

  it('NFC正規化が適用される（濁点合成）', () => {
    // NFD形式のが → NFC形式のが
    const nfd = '\u304C'; // 「が」NFD（か + 濁点）
    const nfc = '\u304C'; // 「が」NFC（合成済み）
    expect(normalizeCastName(nfd)).toBe(nfc);
  });
});

describe('findCastMasterByNormalizedName', () => {
  const masters = [
    { name: 'さくら' },
    { name: '_あおい' },
    { name: 'ひなた  ' },
  ];

  it('完全一致で見つかる', () => {
    expect(findCastMasterByNormalizedName(masters, 'さくら')).toBe(0);
  });

  it('記号付きエントリを正規化名で検索できる', () => {
    expect(findCastMasterByNormalizedName(masters, 'あおい')).toBe(1);
  });

  it('検索名の前後空白を無視して検索できる', () => {
    expect(findCastMasterByNormalizedName(masters, ' ひなた ')).toBe(2);
  });

  it('存在しない名前は -1 を返す', () => {
    expect(findCastMasterByNormalizedName(masters, 'みどり')).toBe(-1);
  });

  it('空文字は -1 を返す', () => {
    expect(findCastMasterByNormalizedName(masters, '')).toBe(-1);
  });
});
