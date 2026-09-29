import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import type { Match } from '@/domain/types';

type MatchListProps = {
  matches: Match[];
  /** 試合ごとの、このGKのシュート数 */
  shotCountByMatch: Map<string, number>;
  onEdit: (match: Match) => void;
  onDelete: (match: Match) => void;
  onExport?: (match: Match) => void;
};

function formatDate(date: string): string {
  return date.replaceAll('-', '/');
}

/** GK詳細の試合一覧（日付の新しい順） */
export function MatchList({ matches, shotCountByMatch, onEdit, onDelete, onExport }: MatchListProps) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {matches.map((match) => (
        <li key={match.id} className="flex items-center gap-2 px-2 py-1">
          <Link
            to={`/matches/${match.id}/record`}
            className="flex min-h-12 flex-1 items-center gap-3 rounded-lg px-2 hover:bg-surface-hover"
          >
            <span className="w-24 font-mono text-sm text-muted">{formatDate(match.date)}</span>
            <span className="flex-1">
              {match.competition && <span className="mr-2 text-sm text-muted">{match.competition}</span>}
              <span className="font-bold">
                {match.homeTeam} vs {match.awayTeam}
              </span>
            </span>
            <span className="text-sm text-muted">{shotCountByMatch.get(match.id) ?? 0}本</span>
            <span aria-hidden="true" className="text-primary">
              記録 ▶
            </span>
          </Link>
          {onExport && (
            <Button size="sm" variant="ghost" aria-label={`${formatDate(match.date)}の試合を書き出す`} onClick={() => onExport(match)}>
              ⤓
            </Button>
          )}
          <Button size="sm" variant="ghost" aria-label={`${formatDate(match.date)}の試合を編集`} onClick={() => onEdit(match)}>
            ✎
          </Button>
          <Button size="sm" variant="ghost" aria-label={`${formatDate(match.date)}の試合を削除`} onClick={() => onDelete(match)}>
            🗑
          </Button>
        </li>
      ))}
    </ul>
  );
}
