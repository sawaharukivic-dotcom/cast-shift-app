import { describe, it, expect } from 'vitest';
import { buildScheduleRenderInput } from '../utils/scheduleAdapter';
import type { TimeSlot, CastMaster, RankLists } from '../types/schedule';

const emptyRanks: RankLists = { gold: [], silver: [], bronze: [] };

const makeCast = (name: string, imageUrl = '', rank?: string) => ({
  id: name,
  name,
  imageUrl,
  rank,
});

const makeMaster = (name: string, imageUrl = '', color?: string): CastMaster => ({
  name,
  imageUrl,
  color,
});

const makeSlot = (time: string, casts: ReturnType<typeof makeCast>[]): TimeSlot => ({
  time,
  casts,
});

describe('buildScheduleRenderInput', () => {
  it('date と timeSlots.time をそのまま引き継ぐ', () => {
    const result = buildScheduleRenderInput('2/18（水）', [], emptyRanks, []);
    expect(result.date).toBe('2/18（水）');
    expect(result.timeSlots).toHaveLength(0);
  });

  it('timeSlots が空の場合は空配列を返す', () => {
    const result = buildScheduleRenderInput('2/18（水）', [], emptyRanks, []);
    expect(result.timeSlots).toEqual([]);
  });

  // ── ランク解決 ──────────────────────────────────────────

  it('rankLists.gold に含まれるキャストは rank="gold" になる', () => {
    const ranks: RankLists = { gold: ['さくら'], silver: [], bronze: [] };
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('さくら')])],
      ranks,
      []
    );
    expect(result.timeSlots[0].casts[0].rank).toBe('gold');
  });

  it('rankLists.silver に含まれるキャストは rank="silver" になる', () => {
    const ranks: RankLists = { gold: [], silver: ['あおい'], bronze: [] };
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('あおい')])],
      ranks,
      []
    );
    expect(result.timeSlots[0].casts[0].rank).toBe('silver');
  });

  it('rankLists.bronze に含まれるキャストは rank="bronze" になる', () => {
    const ranks: RankLists = { gold: [], silver: [], bronze: ['ひなた'] };
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('ひなた')])],
      ranks,
      []
    );
    expect(result.timeSlots[0].casts[0].rank).toBe('bronze');
  });

  it('どのランクにも含まれない場合は rank="normal" になる', () => {
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('みどり')])],
      emptyRanks,
      []
    );
    expect(result.timeSlots[0].casts[0].rank).toBe('normal');
  });

  it('cast.rank が設定済みの場合は rankLists より優先される', () => {
    // cast に 'bronze' が設定済みだが gold リストにも入っている
    const ranks: RankLists = { gold: ['さくら'], silver: [], bronze: [] };
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('さくら', '', 'bronze')])],
      ranks,
      []
    );
    // cast.rank が優先（undefined でない場合）
    expect(result.timeSlots[0].casts[0].rank).toBe('bronze');
  });

  it('ランク名比較は正規化名で行われる（先頭記号があっても一致する）', () => {
    const ranks: RankLists = { gold: ['さくら'], silver: [], bronze: [] };
    // キャスト名に先頭アンダースコア付き
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('_さくら')])],
      ranks,
      []
    );
    expect(result.timeSlots[0].casts[0].rank).toBe('gold');
  });

  // ── 色の解決 ────────────────────────────────────────────

  it('CastMaster に color がある場合はその色が使われる', () => {
    const masters = [makeMaster('さくら', '', '#ff00ff')];
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('さくら')])],
      emptyRanks,
      masters
    );
    expect(result.timeSlots[0].casts[0].color).toBe('#ff00ff');
  });

  it('CastMaster に color がない場合はデフォルト色が使われる', () => {
    const masters = [makeMaster('さくら', '', undefined)];
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('さくら')])],
      emptyRanks,
      masters
    );
    expect(result.timeSlots[0].casts[0].color).toBe('#e5e7eb');
  });

  it('CastMaster が存在しない場合はデフォルト色', () => {
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('みどり')])],
      emptyRanks,
      []
    );
    expect(result.timeSlots[0].casts[0].color).toBe('#e5e7eb');
  });

  // ── imageUrl の解決 ──────────────────────────────────────

  it('CastMaster に imageUrl がある場合はそちらを使う', () => {
    const masters = [makeMaster('さくら', 'https://master.img/sakura.jpg')];
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('さくら', 'https://cast.img/sakura.jpg')])],
      emptyRanks,
      masters
    );
    expect(result.timeSlots[0].casts[0].imageUrl).toBe('https://master.img/sakura.jpg');
  });

  it('CastMaster がない場合は cast.imageUrl を使う', () => {
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('みどり', 'https://cast.img/midori.jpg')])],
      emptyRanks,
      []
    );
    expect(result.timeSlots[0].casts[0].imageUrl).toBe('https://cast.img/midori.jpg');
  });

  it('CastMaster の imageUrl が空の場合は cast.imageUrl にフォールバック', () => {
    const masters = [makeMaster('さくら', '')];
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('さくら', 'https://cast.img/sakura.jpg')])],
      emptyRanks,
      masters
    );
    // master.imageUrl || cast.imageUrl → '' は falsy なので cast.imageUrl
    expect(result.timeSlots[0].casts[0].imageUrl).toBe('https://cast.img/sakura.jpg');
  });

  // ── マスター名の正規化マッチ ─────────────────────────────

  it('正規化名が一致すればマスターから色を引ける（先頭記号違い）', () => {
    const masters = [makeMaster('さくら', '', '#aabbcc')];
    // キャスト名に先頭アンダースコア
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [makeCast('_さくら')])],
      emptyRanks,
      masters
    );
    expect(result.timeSlots[0].casts[0].color).toBe('#aabbcc');
  });

  // ── id と name のパススルー ──────────────────────────────

  it('id と name は変換されずそのまま引き継がれる', () => {
    const result = buildScheduleRenderInput(
      '',
      [makeSlot('11', [{ id: 'cast-001', name: 'さくら', imageUrl: '' }])],
      emptyRanks,
      []
    );
    expect(result.timeSlots[0].casts[0].id).toBe('cast-001');
    expect(result.timeSlots[0].casts[0].name).toBe('さくら');
  });

  // ── logoImage ────────────────────────────────────────────

  it('logoImage が undefined の場合は undefined のまま', () => {
    const result = buildScheduleRenderInput('', [], emptyRanks, [], undefined);
    expect(result.logoImage).toBeUndefined();
  });

  it('logoImage が null の場合は null のまま', () => {
    const result = buildScheduleRenderInput('', [], emptyRanks, [], null);
    expect(result.logoImage).toBeNull();
  });

  // ── 複数スロット・複数キャスト ───────────────────────────

  it('複数スロットの全キャストが変換される', () => {
    const slots: TimeSlot[] = [
      makeSlot('11', [makeCast('さくら'), makeCast('あおい')]),
      makeSlot('12', [makeCast('ひなた')]),
    ];
    const result = buildScheduleRenderInput('', slots, emptyRanks, []);
    expect(result.timeSlots).toHaveLength(2);
    expect(result.timeSlots[0].casts).toHaveLength(2);
    expect(result.timeSlots[1].casts).toHaveLength(1);
  });
});
