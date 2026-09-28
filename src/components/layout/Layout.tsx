import { Link, NavLink, Outlet } from 'react-router';

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <Link to="/" className="flex min-h-11 items-center text-lg font-bold">
          handball_analysis
        </Link>
        <NavLink
          to="/settings"
          className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-surface-hover aria-[current=page]:text-primary"
        >
          データ管理・設定
        </NavLink>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
