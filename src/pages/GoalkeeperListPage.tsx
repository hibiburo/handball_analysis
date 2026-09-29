import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { GoalkeeperForm } from '@/components/goalkeeper/GoalkeeperForm';
import { Button } from '@/components/ui/Button';
import { handednessLabels } from '@/domain/enums';
import { useGoalkeeperSummaries } from '@/hooks/useGoalkeepers';

/** SC1 GK一覧（ホーム）。相手GKをチーム別に一覧表示する */
export function GoalkeeperListPage() {
  const navigate = useNavigate();
  const summaries = useGoalkeeperSummaries();
  const [query, setQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const teamNames = useMemo(() => [...new Set((summaries ?? []).map((g) => g.teamName))], [summaries]);

  const groups = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = (summaries ?? []).filter(
      (g) => keyword === '' || g.name.toLowerCase().includes(keyword) || g.teamName.toLowerCase().includes(keyword),
    );
    const byTeam = new Map<string, typeof filtered>();
    for (const goalkeeper of filtered) {
      byTeam.set(goalkeeper.teamName, [...(byTeam.get(goalkeeper.teamName) ?? []), goalkeeper]);
    }
    return [...byTeam.entries()];
  }, [summaries, query]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">GK一覧</h1>
        <Button variant="primary" onClick={() => setIsFormOpen(true)}>
          ＋ GKを追加
        </Button>
      </div>

      {summaries === undefined ? (
        <p className="text-muted">読み込み中…</p>
      ) : summaries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-bold">まだGKが登録されていません</p>
          <p className="mt-1 text-sm text-muted">
            分析したい相手チームのGKを追加し、試合（YouTube の動画）を登録するとシュートを記録できます。
          </p>
        </div>
      ) : (
        <>
          <input
            type="search"
            aria-label="チーム名・GK名で検索"
            placeholder="🔍 チーム名・GK名で検索"
            className="min-h-11 rounded-lg border border-border bg-surface px-3"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {groups.length === 0 && <p className="text-muted">「{query}」に一致するGKはいません</p>}
          {groups.map(([teamName, goalkeepers]) => (
            <section key={teamName} aria-labelledby={`team-${teamName}`}>
              <h2 id={`team-${teamName}`} className="mb-1 text-sm font-bold text-muted">
                {teamName}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {goalkeepers.map((goalkeeper) => (
                  <li key={goalkeeper.id}>
                    <Link
                      to={`/goalkeepers/${goalkeeper.id}`}
                      className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-hover"
                    >
                      <span className="w-12 text-right font-mono text-muted">
                        {goalkeeper.number !== undefined ? `#${goalkeeper.number}` : ''}
                      </span>
                      <span className="flex-1 font-bold">{goalkeeper.name}</span>
                      <span className="text-sm text-muted">{handednessLabels[goalkeeper.handedness]}</span>
                      <span className="w-40 text-right text-sm text-muted">
                        試合 {goalkeeper.matchCount} / シュート {goalkeeper.shotCount}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <GoalkeeperForm
        isOpen={isFormOpen}
        teamNameSuggestions={teamNames}
        onClose={() => setIsFormOpen(false)}
        onSaved={(goalkeeper) => navigate(`/goalkeepers/${goalkeeper.id}`)}
      />
    </div>
  );
}
