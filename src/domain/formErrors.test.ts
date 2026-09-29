import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { toFieldErrors } from './formErrors';

function errorsOf(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  if (result.success) throw new Error('エラーになるはずが成功した');
  return toFieldErrors(result.error);
}

describe('toFieldErrors', () => {
  const schema = z.object({
    name: z.string().trim().min(1).max(5),
    number: z.int().min(0).max(99).optional(),
    url: z.url(),
    kind: z.enum(['a', 'b']),
  });
  const valid = { name: '山田', url: 'https://example.com', kind: 'a' };

  it('空の文字列は「入力してください」', () => {
    expect(errorsOf(schema, { ...valid, name: '  ' })).toEqual({ name: '入力してください' });
  });

  it('長すぎる文字列は文字数の上限を示す', () => {
    expect(errorsOf(schema, { ...valid, name: 'あいうえおか' })).toEqual({ name: '5文字以内で入力してください' });
  });

  it('数値の範囲外は上限・下限を示す', () => {
    expect(errorsOf(schema, { ...valid, number: 100 })).toEqual({ number: '99以下で入力してください' });
    expect(errorsOf(schema, { ...valid, number: -1 })).toEqual({ number: '0以上で入力してください' });
  });

  it('数値でない値は「数字で入力してください」', () => {
    expect(errorsOf(schema, { ...valid, number: 1.5 })).toEqual({ number: '数字で入力してください' });
  });

  it('URL の形式でない値と、選択肢にない値', () => {
    expect(errorsOf(schema, { ...valid, url: 'abc' })).toEqual({ url: 'URLの形式で入力してください' });
    expect(errorsOf(schema, { ...valid, kind: 'c' })).toEqual({ kind: '選択してください' });
  });

  it('未入力の必須項目は「入力してください」', () => {
    expect(errorsOf(schema, { url: valid.url, kind: 'a' })).toEqual({ name: '入力してください' });
  });

  it('日付の形式違いなどは「形式が正しくありません」、その他は「入力内容を確認してください」', () => {
    expect(errorsOf(z.object({ date: z.iso.date() }), { date: '2026/09/29' })).toEqual({
      date: '形式が正しくありません',
    });
    expect(errorsOf(z.object({ v: z.string().refine(() => false) }), { v: 'x' })).toEqual({
      v: '入力内容を確認してください',
    });
  });

  it('同じ項目の2つ目以降のエラーは無視する', () => {
    const multi = z.object({ v: z.string().min(3).regex(/^\d+$/) });
    expect(errorsOf(multi, { v: 'a' })).toEqual({ v: '入力してください' });
  });
});
