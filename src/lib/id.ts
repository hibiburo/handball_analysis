/** 新しいIDを作る。crypto.randomUUID は HTTPS または localhost でのみ使える（architecture.md 3.3） */
export function createId(): string {
  return crypto.randomUUID();
}
