import type { ExampleVisual } from "@/lib/practice/example";

export function ExampleVisualView({ visual }: { visual: ExampleVisual }) {
  if (visual.kind === "ten-frame") return <TenFrame filled={visual.filled} />;
  if (visual.kind === "number-line") return <NumberLine visual={visual} />;
  if (visual.kind === "base-ten") return <BaseTen visual={visual} />;
  if (visual.kind === "groups") return <Groups visual={visual} />;
  if (visual.kind === "array") return <ArrayDots visual={visual} />;
  if (visual.kind === "area-split") return <AreaSplit visual={visual} />;
  if (visual.kind === "fraction-bars") return <FractionBars visual={visual} />;
  if (visual.kind === "place-chart") return <PlaceChart visual={visual} />;
  if (visual.kind === "area-shape") return <AreaShape visual={visual} />;
  if (visual.kind === "volume") return <VolumeBox visual={visual} />;
  if (visual.kind === "decimal-grid") return <DecimalGrid visual={visual} />;
  return <Lengths visual={visual} />;
}

function TenFrame({ filled }: { filled: number }) {
  const count = clamp(filled, 0, 10);
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Ten frame">
      {Array.from({ length: 10 }, (_, index) => {
        const column = index % 5;
        const row = Math.floor(index / 5);
        const x = 28 + column * 48;
        const y = 16 + row * 40;
        return (
          <g key={index}>
            <rect className="frame-cell" x={x} y={y} width="40" height="32" rx="6" />
            {index < count ? <circle className="dot" cx={x + 20} cy={y + 16} r="8" /> : null}
          </g>
        );
      })}
    </svg>
  );
}

function NumberLine({ visual }: { visual: Extract<ExampleVisual, { kind: "number-line" }> }) {
  const min = Math.min(visual.min, visual.max);
  const max = Math.max(visual.max, min + 1);
  const from = clamp(visual.from, min, max);
  const to = clamp(visual.to, min, max);
  const left = 18;
  const right = 262;
  const width = right - left;
  const y = 58;
  const xAt = (value: number) => left + ((value - min) / (max - min)) * width;
  const tickCount = Math.min(21, Math.round(max - min) + 1);
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Number line">
      <line className="line-axis" x1={left} y1={y} x2={right} y2={y} />
      {Array.from({ length: tickCount }, (_, index) => {
        const x = left + (width * index) / Math.max(tickCount - 1, 1);
        return <line key={index} className="line-tick" x1={x} y1={y - 8} x2={x} y2={y + 8} />;
      })}
      {from !== to ? (
        <path
          className="line-hop"
          pathLength={100}
          d={`M ${xAt(from)} ${y} Q ${(xAt(from) + xAt(to)) / 2} ${y - 26} ${xAt(to)} ${y}`}
        />
      ) : null}
      <circle className="line-point dim" cx={xAt(from)} cy={y} r="4" />
      <circle className="line-point" cx={xAt(to)} cy={y} r="5" />
    </svg>
  );
}

function BaseTen({ visual }: { visual: Extract<ExampleVisual, { kind: "base-ten" }> }) {
  const tens = clamp(visual.tens, 0, 9);
  const ones = clamp(visual.ones, 0, 9);
  const focus = visual.focus ?? "tens";
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Base ten blocks">
      {Array.from({ length: tens }, (_, index) => (
        <rect
          key={`t${index}`}
          className={focus === "tens" ? "block ten" : "block ten dim"}
          x={24 + index * 16}
          y={18}
          width="10"
          height="52"
          rx="2"
        />
      ))}
      {Array.from({ length: ones }, (_, index) => (
        <rect
          key={`o${index}`}
          className={focus === "ones" ? "block one" : "block one dim"}
          x={180 + (index % 5) * 16}
          y={22 + Math.floor(index / 5) * 16}
          width="12"
          height="12"
          rx="2"
        />
      ))}
    </svg>
  );
}

function Groups({ visual }: { visual: Extract<ExampleVisual, { kind: "groups" }> }) {
  const groups = clamp(visual.groups, 1, 8);
  const each = clamp(visual.each, 1, 12);
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Equal groups">
      {Array.from({ length: groups }, (_, group) => {
        const x = 22 + (group % 4) * 68;
        const y = group < 4 ? 28 : 72;
        return (
          <g key={group}>
            <circle className="group-ring" cx={x} cy={y} r="22" />
            {each <= 6
              ? Array.from({ length: each }, (_, dot) => (
                  <circle key={dot} className="dot" cx={x - 10 + (dot % 3) * 10} cy={y - 6 + Math.floor(dot / 3) * 10} r="3" />
                ))
              : (
                  <text className="group-count" x={x} y={y + 4} textAnchor="middle">
                    {each}
                  </text>
                )}
          </g>
        );
      })}
    </svg>
  );
}

function ArrayDots({ visual }: { visual: Extract<ExampleVisual, { kind: "array" }> }) {
  const rows = clamp(visual.rows, 1, 12);
  const columns = clamp(visual.columns, 1, 12);
  const gap = 4;
  const size = Math.min(14, Math.floor((250 - gap * columns) / columns), Math.floor((78 - gap * rows) / rows));
  const radius = Math.max(2.5, size / 3);
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Array">
      {Array.from({ length: rows * columns }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return (
          <circle
            key={index}
            className="dot"
            cx={16 + column * (size + gap)}
            cy={12 + row * (size + gap)}
            r={radius}
          />
        );
      })}
    </svg>
  );
}

function AreaSplit({ visual }: { visual: Extract<ExampleVisual, { kind: "area-split" }> }) {
  const tens = Math.max(1, visual.tens);
  const ones = Math.max(0, visual.ones);
  const total = tens + ones;
  const width = 220;
  const tensWidth = ones === 0 ? width : Math.max(36, Math.round((width * tens) / total));
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Area model">
      <rect className="area-tens" x="30" y="22" width={tensWidth} height="52" />
      {ones > 0 ? <rect className="area-ones" x={30 + tensWidth} y="22" width={width - tensWidth} height="52" /> : null}
    </svg>
  );
}

function FractionBars({ visual }: { visual: Extract<ExampleVisual, { kind: "fraction-bars" }> }) {
  const parts = clamp(visual.parts, 2, 12);
  const left = clamp(visual.left, 0, parts);
  const right = clamp(visual.right, 0, parts);
  const result = visual.op === "+" ? clamp(left + right, 0, parts) : clamp(left - right, 0, parts);
  if (visual.phase === "result") {
    return (
      <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Fraction bar">
        <Bar x={24} y={34} parts={parts} shaded={result} />
      </svg>
    );
  }
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Fraction bars">
      <Bar x={24} y={14} parts={parts} shaded={left} />
      <Bar x={24} y={54} parts={parts} shaded={right} muted />
    </svg>
  );
}

function Bar({
  x,
  y,
  parts,
  shaded,
  muted = false,
}: {
  x: number;
  y: number;
  parts: number;
  shaded: number;
  muted?: boolean;
}) {
  const width = 232;
  const piece = width / parts;
  return (
    <g>
      <rect className="bar-track" x={x} y={y} width={width} height="22" rx="4" />
      {Array.from({ length: parts }, (_, index) => (
        <rect
          key={index}
          className={index < shaded ? (muted ? "bar-shade muted" : "bar-shade") : "bar-empty"}
          x={x + index * piece + 1}
          y={y + 1}
          width={Math.max(0, piece - 2)}
          height="20"
        />
      ))}
    </g>
  );
}

function PlaceChart({ visual }: { visual: Extract<ExampleVisual, { kind: "place-chart" }> }) {
  return (
    <ol className="place-chart" aria-label="Place value chart">
      {visual.labels.map((label, index) => (
        <li key={label} className={index === visual.highlight ? "is-focus" : undefined}>
          <span className="place-label">{label}</span>
          <span className="place-digit">{visual.digits[index] ?? ""}</span>
        </li>
      ))}
    </ol>
  );
}

function AreaShape({ visual }: { visual: Extract<ExampleVisual, { kind: "area-shape" }> }) {
  const triangle = visual.shape === "triangle";
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label={triangle ? "Triangle" : "Parallelogram"}>
      {triangle ? (
        <polygon className="area-shape" points="46,78 234,78 140,18" />
      ) : (
        <polygon className="area-shape" points="70,78 234,78 210,18 46,18" />
      )}
      <line className="height-line" x1={triangle ? 140 : 70} y1="78" x2={triangle ? 140 : 70} y2="18" />
    </svg>
  );
}

function VolumeBox({ visual }: { visual: Extract<ExampleVisual, { kind: "volume" }> }) {
  const length = clamp(visual.length, 1, 8);
  const width = clamp(visual.width, 1, 6);
  const height = clamp(visual.height, 1, 6);
  const unit = 8;
  const frontW = length * unit;
  const side = width * unit * 0.7;
  const frontH = height * unit;
  const x = 78;
  const y = 28;
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Rectangular prism">
      <polygon className="box-top" points={`${x},${y} ${x + side},${y - 16} ${x + frontW + side},${y - 16} ${x + frontW},${y}`} />
      <polygon className="box-side" points={`${x + frontW},${y} ${x + frontW + side},${y - 16} ${x + frontW + side},${y - 16 + frontH} ${x + frontW},${y + frontH}`} />
      <rect className="box-front" x={x} y={y} width={frontW} height={frontH} />
    </svg>
  );
}

function DecimalGrid({ visual }: { visual: Extract<ExampleVisual, { kind: "decimal-grid" }> }) {
  const first = clamp(visual.first, 0, 100);
  const second = clamp(visual.second, 0, 100);
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Hundredths grid">
      {Array.from({ length: 100 }, (_, index) => {
        const column = index % 10;
        const row = Math.floor(index / 10);
        const removed = visual.op === "-" && index < second;
        const shaded = visual.op === "+" ? index < first + second : index < first;
        const added = visual.op === "+" && index >= first && index < first + second;
        const tone = !shaded ? "cell" : removed ? "cell removed" : added ? "cell added" : "cell filled";
        return <rect key={index} className={tone} x={90 + column * 10} y={4 + row * 8.6} width="9" height="7.6" />;
      })}
    </svg>
  );
}

function Lengths({ visual }: { visual: Extract<ExampleVisual, { kind: "lengths" }> }) {
  const longer = clamp(visual.longer, 1, 12);
  const shorter = clamp(visual.shorter, 1, longer);
  return (
    <svg className="example-visual walk-visual" viewBox="0 0 280 96" role="img" aria-label="Two lengths">
      <LengthRow y={24} count={longer} />
      <LengthRow y={58} count={shorter} muted />
    </svg>
  );
}

function LengthRow({ y, count, muted = false }: { y: number; count: number; muted?: boolean }) {
  return (
    <g>
      {Array.from({ length: count }, (_, index) => (
        <rect key={index} className={muted ? "clip muted" : "clip"} x={16 + index * 18} y={y} width="14" height="22" rx="3" />
      ))}
    </g>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
