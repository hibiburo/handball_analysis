import type { z } from 'zod';

/**
 * Zod の検証エラーを、項目ごとの利用者向けの文言にする（最初のエラーのみ）。
 * フォームの項目の下に表示する。
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field in errors) continue;
    errors[field] = issueMessage(issue);
  }
  return errors;
}

function issueMessage(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case 'too_small':
      return issue.origin === 'string' ? '入力してください' : `${String(issue.minimum)}以上で入力してください`;
    case 'too_big':
      return issue.origin === 'string'
        ? `${String(issue.maximum)}文字以内で入力してください`
        : `${String(issue.maximum)}以下で入力してください`;
    case 'invalid_type':
      return issue.expected === 'int' || issue.expected === 'number' ? '数字で入力してください' : '入力してください';
    case 'invalid_format':
      return issue.format === 'url' ? 'URLの形式で入力してください' : '形式が正しくありません';
    case 'invalid_value':
      return '選択してください';
    default:
      return '入力内容を確認してください';
  }
}
