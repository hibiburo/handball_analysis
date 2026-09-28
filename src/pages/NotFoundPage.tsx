import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3 p-6">
      <h1 className="text-xl font-bold">ページが見つかりません</h1>
      <Link to="/" className="flex min-h-11 items-center font-medium text-primary">
        GK一覧に戻る
      </Link>
    </div>
  );
}
