import { describe, it, expect } from 'vitest'
import { getLayout, LAYOUT_16_9, LAYOUT_1_1 } from '../utils/rendererConstants'

/**
 * CA-REND-01 回帰テスト:
 * getLayout がアスペクト比に「対応する」レイアウトを返すこと（以前は三項が逆だった）。
 */
describe('getLayout: アスペクト比に対応するレイアウトを返す', () => {
  it('"16:9" → LAYOUT_16_9 (4800x2700, CARD_SIZE=112)', () => {
    expect(getLayout('16:9')).toBe(LAYOUT_16_9)
    expect(getLayout('16:9').CANVAS_WIDTH).toBe(4800)
    expect(getLayout('16:9').CANVAS_HEIGHT).toBe(2700)
    expect(getLayout('16:9').CARD_SIZE).toBe(112)
  })
  it('"1:1" → LAYOUT_1_1 (4800x4800, CARD_SIZE=224)', () => {
    expect(getLayout('1:1')).toBe(LAYOUT_1_1)
    expect(getLayout('1:1').CANVAS_WIDTH).toBe(4800)
    expect(getLayout('1:1').CANVAS_HEIGHT).toBe(4800)
    expect(getLayout('1:1').CARD_SIZE).toBe(224)
  })
})
