import { describe, it, expect } from 'vitest';
import { buildSheetRows } from '../utils/scheduleSheetRenderer';
import type { RenderTimeSlot } from '../types/renderTypes';

const makeCast = (name: string, color = '#ff0000', imageUrl = '') => ({
  id: name,
  name,
  imageUrl,
  rank: 'normal' as const,
  color,
});

describe('buildSheetRows', () => {
  it('空のスロットは空の行を返す', () => {
    expect(buildSheetRows([])).toEqual([]);
  });

  it('1スロット1キャストを正しく変換する', () => {
    const slots: RenderTimeSlot[] = [
      { time: '11', casts: [makeCast('さくら', '#aabbcc')] },
    ];
    const rows = buildSheetRows(slots);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('さくら');
    expect(rows[0].color).toBe('#aabbcc');
    expect(rows[0].hours).toEqual([11]);
  });

  it('同一キャストが複数スロットに出ている場合は1行に集約される', () => {
    const slots: RenderTimeSlot[] = [
      { time: '11', casts: [makeCast('さくら')] },
      { time: '12', casts: [makeCast('さくら')] },
      { time: '13', casts: [makeCast('さくら')] },
    ];
    const rows = buildSheetRows(slots);
    expect(rows).toHaveLength(1);
    expect(rows[0].hours).toEqual([11, 12, 13]);
  });

  it('hoursは昇順にソートされる', () => {
    const slots: RenderTimeSlot[] = [
      { time: '15', casts: [makeCast('あおい')] },
      { time: '11', casts: [makeCast('あおい')] },
      { time: '13', casts: [makeCast('あおい')] },
    ];
    const rows = buildSheetRows(slots);
    expect(rows[0].hours).toEqual([11, 13, 15]);
  });

  it('複数キャストが初出順で並ぶ', () => {
    const slots: RenderTimeSlot[] = [
      { time: '11', casts: [makeCast('さくら'), makeCast('あおい')] },
      { time: '12', casts: [makeCast('ひなた'), makeCast('さくら')] },
    ];
    const rows = buildSheetRows(slots);
    expect(rows.map(r => r.name)).toEqual(['さくら', 'あおい', 'ひなた']);
  });

  it('各キャストのhoursは自分が出勤するスロットのみ含む', () => {
    const slots: RenderTimeSlot[] = [
      { time: '11', casts: [makeCast('さくら')] },
      { time: '12', casts: [makeCast('あおい')] },
      { time: '13', casts: [makeCast('さくら'), makeCast('あおい')] },
    ];
    const rows = buildSheetRows(slots);
    const sakura = rows.find(r => r.name === 'さくら')!;
    const aoi = rows.find(r => r.name === 'あおい')!;
    expect(sakura.hours).toEqual([11, 13]);
    expect(aoi.hours).toEqual([12, 13]);
  });

  it('imageUrlをキャストから受け取る', () => {
    const slots: RenderTimeSlot[] = [
      { time: '11', casts: [makeCast('さくら', '#000', 'http://example.com/img.jpg')] },
    ];
    const rows = buildSheetRows(slots);
    expect(rows[0].imageUrl).toBe('http://example.com/img.jpg');
  });

  it('キャストの色はfirstキャスト情報を使う（重複スロットで色が変わらない）', () => {
    const first = makeCast('さくら', '#111111');
    const second = makeCast('さくら', '#222222'); // 同名・別色（実際にはないが境界テスト）
    const slots: RenderTimeSlot[] = [
      { time: '11', casts: [first] },
      { time: '12', casts: [second] },
    ];
    const rows = buildSheetRows(slots);
    // buildSheetRows は castByName に最初に出たキャストを保存するため #111111
    expect(rows[0].color).toBe('#111111');
  });
});
