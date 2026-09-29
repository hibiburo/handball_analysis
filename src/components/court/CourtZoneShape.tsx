import type { ShotZone } from '@/domain/enums';

/**
 * 半面コートの図形（design.md 2.5）。ゴールを上に置き、1m = 20px で描く（viewBox 400×300 = 幅20m×奥行15m）。
 * 左右はシューターから見た向き（画面の左 = レフト）。
 * ゾーンはゴール中央からの距離と角度（真下が0度、左がマイナス）で区切る。
 */
const GOAL_X = 200;
const PX_PER_M = 20;
const R_6M = 6 * PX_PER_M;
/** 6m ゾーンの外側の境界。タップ領域を確保するため 8.25m とする */
const R_PIVOT_OUTER = 8.25 * PX_PER_M;
const R_9M = 9 * PX_PER_M;
const R_FAR = 30 * PX_PER_M;

/** ウイングとそれ以外の境界の角度 */
const WING_ANGLE = 55;
/** 中央（センター・6m中央）の左右の境界の角度 */
const CENTER_ANGLE = 18;

function point(r: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return [GOAL_X + r * Math.sin(rad), r * Math.cos(rad)];
}

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 300;
/** 円弧を折れ線で近似するときの分割数 */
const ARC_SEGMENTS = 24;

type Point = [number, number];

/**
 * 多角形を表示範囲（0〜400 × 0〜300）で切り取る（Sutherland–Hodgman 法）。
 * 図形の外接矩形がコート図の外に広がらないようにする（タップ位置の計算やフォーカス枠がずれないため）。
 */
function clipToView(polygon: Point[]): Point[] {
  const edges: { inside: (p: Point) => boolean; intersect: (a: Point, b: Point) => Point }[] = [
    { inside: (p) => p[0] >= 0, intersect: (a, b) => [0, a[1] + ((b[1] - a[1]) * (0 - a[0])) / (b[0] - a[0])] },
    {
      inside: (p) => p[0] <= VIEW_WIDTH,
      intersect: (a, b) => [VIEW_WIDTH, a[1] + ((b[1] - a[1]) * (VIEW_WIDTH - a[0])) / (b[0] - a[0])],
    },
    { inside: (p) => p[1] >= 0, intersect: (a, b) => [a[0] + ((b[0] - a[0]) * (0 - a[1])) / (b[1] - a[1]), 0] },
    {
      inside: (p) => p[1] <= VIEW_HEIGHT,
      intersect: (a, b) => [a[0] + ((b[0] - a[0]) * (VIEW_HEIGHT - a[1])) / (b[1] - a[1]), VIEW_HEIGHT],
    },
  ];
  let output = polygon;
  for (const edge of edges) {
    const input = output;
    output = [];
    input.forEach((current, i) => {
      const previous = input[(i + input.length - 1) % input.length] ?? current;
      if (edge.inside(current)) {
        if (!edge.inside(previous)) output.push(edge.intersect(previous, current));
        output.push(current);
      } else if (edge.inside(previous)) {
        output.push(edge.intersect(previous, current));
      }
    });
  }
  return output;
}

function arcPoints(r: number, from: number, to: number): Point[] {
  return Array.from({ length: ARC_SEGMENTS + 1 }, (_, i) => point(r, from + ((to - from) * i) / ARC_SEGMENTS));
}

/** 半径 r1〜r2、角度 a1〜a2 の扇形の領域（表示範囲で切り取った多角形） */
function sectorPath(r1: number, r2: number, a1: number, a2: number): string {
  const polygon = clipToView([...arcPoints(r2, a1, a2), ...arcPoints(r1, a2, a1)]);
  return `${polygon.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} Z`;
}

/** 半径 r、角度 a1〜a2 の円弧（線のみ） */
function arcPath(r: number, a1: number, a2: number): string {
  const [x1, y1] = point(r, a1);
  const [x2, y2] = point(r, a2);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0 0 ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

type CourtZoneGeometry = {
  zone: ShotZone;
  path: string;
  labelX: number;
  labelY: number;
};

function geometry(
  zone: ShotZone,
  r1: number,
  r2: number,
  a1: number,
  a2: number,
  label: number | Point,
): CourtZoneGeometry {
  // label は文字の位置。半径を渡すと角度の中央に置き、座標を渡すとその位置に置く
  const [labelX, labelY] = typeof label === 'number' ? point(label, (a1 + a2) / 2) : label;
  return { zone, path: sectorPath(r1, r2, a1, a2), labelX, labelY };
}

const courtZones: CourtZoneGeometry[] = [
  // ウイングはゴールライン際の隅の狭い領域のため、文字の位置を個別に指定する
  geometry('lw', R_6M, R_FAR, -90, -WING_ANGLE, [44, 44]),
  geometry('rw', R_6M, R_FAR, WING_ANGLE, 90, [VIEW_WIDTH - 44, 44]),
  geometry('pivot_l', R_6M, R_PIVOT_OUTER, -WING_ANGLE, -CENTER_ANGLE, (R_6M + R_PIVOT_OUTER) / 2),
  geometry('pivot_c', R_6M, R_PIVOT_OUTER, -CENTER_ANGLE, CENTER_ANGLE, (R_6M + R_PIVOT_OUTER) / 2),
  geometry('pivot_r', R_6M, R_PIVOT_OUTER, CENTER_ANGLE, WING_ANGLE, (R_6M + R_PIVOT_OUTER) / 2),
  geometry('lb', R_PIVOT_OUTER, R_FAR, -WING_ANGLE, -CENTER_ANGLE, 225),
  geometry('cb', R_PIVOT_OUTER, R_FAR, -CENTER_ANGLE, CENTER_ANGLE, 225),
  geometry('rb', R_PIVOT_OUTER, R_FAR, CENTER_ANGLE, WING_ANGLE, 225),
];

export type CourtZoneRenderProps = {
  /** ゾーンの塗り（Tailwind の fill クラス） */
  fillClassName: string;
  /** ゾーンに表示する文字（1行目は表示名、2行目は数値など） */
  lines: string[];
  textClassName?: string;
  ariaLabel: string;
  isPressed?: boolean;
  onSelect?: () => void;
};

type CourtDiagramProps = {
  getZoneProps: (zone: ShotZone) => CourtZoneRenderProps;
  className?: string;
};

/** コート図。ゾーンの見た目と操作は getZoneProps で指定する（記録の CourtZonePicker と分析の CourtZoneMap で共有） */
export function CourtDiagram({ getZoneProps, className }: CourtDiagramProps) {
  const sixMeterPath = sectorPath(0.01, R_6M, -90, 90);
  return (
    <svg viewBox="0 0 400 300" className={className} role="group" aria-label="コート図">
      <defs>
        <clipPath id="court-clip">
          <rect x="0" y="0" width="400" height="300" />
        </clipPath>
      </defs>
      <g clipPath="url(#court-clip)">
        <rect x="0" y="0" width="400" height="300" className="fill-surface" />
        {courtZones.map(({ zone, path, labelX, labelY }) => {
          const props = getZoneProps(zone);
          const interactive = props.onSelect !== undefined;
          return (
            <g
              key={zone}
              role={interactive ? 'button' : 'img'}
              aria-label={props.ariaLabel}
              aria-pressed={interactive ? (props.isPressed ?? false) : undefined}
              tabIndex={interactive ? 0 : undefined}
              className={
                interactive
                  ? 'cursor-pointer outline-none [&:focus-visible>path]:stroke-primary [&:focus-visible>path]:stroke-[4]'
                  : undefined
              }
              onClick={props.onSelect}
              onKeyDown={(event) => {
                if (interactive && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  props.onSelect?.();
                }
              }}
            >
              <path d={path} className={`${props.fillClassName} stroke-border`} strokeWidth={1.5} />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`pointer-events-none text-[13px] font-bold ${props.textClassName ?? 'fill-foreground'}`}
              >
                {props.lines.map((line, i) => (
                  <tspan key={i} x={labelX} dy={i === 0 ? `${-(props.lines.length - 1) * 0.6}em` : '1.2em'}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
        {/* ゴールエリア（6mライン）と 9mライン、ゴール */}
        <path d={sixMeterPath} className="pointer-events-none fill-surface-hover stroke-foreground" strokeWidth={2} />
        <path
          d={arcPath(R_9M, -70, 70)}
          className="pointer-events-none fill-none stroke-muted"
          strokeWidth={1.5}
          strokeDasharray="6 5"
        />
        <rect x={GOAL_X - 30} y={0} width={60} height={8} className="pointer-events-none fill-foreground" />
      </g>
    </svg>
  );
}
