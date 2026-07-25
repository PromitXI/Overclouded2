import { Canvas, C, RGB, SERIES, niceMax, money, pct } from './primitives';

export interface Box { x: number; y: number; w: number; h: number }

/** A card shell with a title bar; returns the inner plot box. */
export const card = (cv: Canvas, box: Box, title: string, note?: string): Box => {
  cv.outlined(box.x, box.y, box.w, box.h, C.white, C.slate200, 2);
  cv.text(title, box.x + 4, box.y + 6, { size: 8, bold: true, color: C.ink });
  if (note) cv.text(note, box.x + box.w - 4, box.y + 6, { size: 6, color: C.slate400, align: 'right' });
  return { x: box.x + 4, y: box.y + 9.5, w: box.w - 8, h: box.h - 13.5 };
};

/** Compact KPI tile. `delta` renders a colored change indicator when supplied. */
export const kpi = (
  cv: Canvas,
  box: Box,
  label: string,
  value: string,
  accent: RGB,
  bg: RGB,
  delta?: { text: string; good: boolean }
) => {
  cv.rect(box.x, box.y, box.w, box.h, bg, 1.5);
  cv.text(label.toUpperCase(), box.x + 3, box.y + 5, { size: 5.2, bold: true, color: C.slate500, maxWidth: box.w - 6 });
  cv.text(value, box.x + 3, box.y + 12, { size: 13, bold: true, color: accent, maxWidth: box.w - 6 });
  if (delta) {
    cv.text(delta.text, box.x + 3, box.y + box.h - 2.5, {
      size: 5.4,
      bold: true,
      color: delta.good ? C.green : C.red,
      maxWidth: box.w - 6,
    });
  }
};

/** Radial score gauge (270° sweep) with the value in the middle. */
export const gauge = (cv: Canvas, cx: number, cy: number, r: number, value: number, color: RGB, label: string, suffix = '%') => {
  const start = 135;
  const sweep = 270;
  const inner = r - 3.2;
  cv.arc(cx, cy, r, inner, start, start + sweep, C.slate100);
  const clamped = Math.max(0, Math.min(100, value));
  if (clamped > 0) cv.arc(cx, cy, r, inner, start, start + (sweep * clamped) / 100, color);
  cv.text(`${Math.round(value)}${suffix}`, cx, cy + 1.5, { size: 11, bold: true, color: C.ink, align: 'center' });
  cv.text(label, cx, cy + r + 4.5, { size: 5.8, bold: true, color: C.slate500, align: 'center' });
};

interface Series {
  points: number[];
  color: RGB;
  fill?: boolean;
  dashed?: boolean;
  label: string;
  /** Index offset so a forecast series can start where actuals end. */
  offset?: number;
}

/**
 * Line/area chart with a value axis, category axis and optional horizontal
 * reference line. Used for the cost trend (actual vs forecast) and the
 * utilization series.
 */
export const lineChart = (
  cv: Canvas,
  box: Box,
  categories: string[],
  series: Series[],
  o: {
    yFormat?: (v: number) => string;
    yMax?: number;
    yMin?: number;
    reference?: { value: number; label: string; color?: RGB };
    legend?: boolean;
  } = {}
) => {
  const { yFormat = (v) => String(Math.round(v)), reference, legend = true } = o;
  const padL = 16;
  const padB = 6;
  const legendH = legend ? 5 : 0;
  const plot = {
    x: box.x + padL,
    y: box.y + legendH,
    w: box.w - padL,
    h: box.h - padB - legendH,
  };

  const all = series.flatMap((s) => s.points).concat(reference ? [reference.value] : []);
  const yMax = o.yMax ?? niceMax(Math.max(...all, 1) * 1.1);
  const yMin = o.yMin ?? 0;
  const sx = (i: number) => plot.x + (categories.length <= 1 ? 0 : (plot.w * i) / (categories.length - 1));
  const sy = (v: number) => plot.y + plot.h - ((v - yMin) / (yMax - yMin || 1)) * plot.h;

  // Gridlines + value axis
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + ((yMax - yMin) * i) / ticks;
    const gy = sy(v);
    cv.line(plot.x, gy, plot.x + plot.w, gy, C.slate100, 0.2);
    cv.text(yFormat(v), plot.x - 2, gy + 1, { size: 5, color: C.slate400, align: 'right' });
  }

  // Category axis — thin out labels so they never collide
  const stride = Math.max(1, Math.ceil(categories.length / 8));
  categories.forEach((c, i) => {
    if (i % stride !== 0 && i !== categories.length - 1) return;
    cv.text(c, sx(i), plot.y + plot.h + 4, { size: 5, color: C.slate400, align: 'center' });
  });

  // Reference line (e.g. daily budget pace)
  if (reference) {
    const ry = sy(reference.value);
    cv.line(plot.x, ry, plot.x + plot.w, ry, reference.color ?? C.red, 0.4, [1.2, 1.2]);
    // Left-anchored: the right edge is where the forecast series ends up.
    cv.text(reference.label, plot.x + 1.5, ry - 1.5, { size: 5, bold: true, color: reference.color ?? C.red });
  }

  // Series
  series.forEach((s) => {
    const off = s.offset ?? 0;
    const pts: Array<[number, number]> = s.points.map((v, i) => [sx(i + off), sy(v)]);
    if (pts.length === 0) return;
    if (s.fill && pts.length > 1) {
      const poly: Array<[number, number]> = [
        [pts[0][0], plot.y + plot.h],
        ...pts,
        [pts[pts.length - 1][0], plot.y + plot.h],
      ];
      // Approximate transparency with a pale tint — jsPDF fills are opaque.
      cv.polygon(poly, s.color === C.blue ? C.blue50 : C.slate50);
    }
    cv.polyline(pts, s.color, 0.8, s.dashed ? [1.4, 1.2] : undefined);
    pts.forEach(([px, py]) => {
      cv.pdf.setFillColor(...s.color);
      cv.pdf.circle(px, py, 0.7, 'F');
    });
  });

  if (legend) {
    let lx = box.x + padL;
    series.forEach((s) => {
      cv.rect(lx, box.y - 1.5, 4, 1.4, s.color, 0.5);
      cv.text(s.label, lx + 5.5, box.y, { size: 5.4, color: C.slate500 });
      lx += 7 + cv.pdf.getTextWidth(s.label) + 6;
    });
  }
};

/** Vertical column chart with per-column color support. */
export const columnChart = (
  cv: Canvas,
  box: Box,
  items: Array<{ label: string; value: number; color?: RGB }>,
  o: { yFormat?: (v: number) => string; valueLabels?: boolean } = {}
) => {
  const { yFormat = (v) => String(Math.round(v)), valueLabels = true } = o;
  if (items.length === 0) return empty(cv, box);
  const padL = 16;
  const padB = 6;
  const plot = { x: box.x + padL, y: box.y, w: box.w - padL, h: box.h - padB };
  const yMax = niceMax(Math.max(...items.map((i) => i.value), 1) * 1.15);
  const sy = (v: number) => plot.y + plot.h - (v / yMax) * plot.h;

  for (let i = 0; i <= 4; i++) {
    const v = (yMax * i) / 4;
    cv.line(plot.x, sy(v), plot.x + plot.w, sy(v), C.slate100, 0.2);
    cv.text(yFormat(v), plot.x - 2, sy(v) + 1, { size: 5, color: C.slate400, align: 'right' });
  }

  const slot = plot.w / items.length;
  const barW = Math.min(slot * 0.6, 9);
  items.forEach((it, i) => {
    const cx = plot.x + slot * i + slot / 2;
    const top = sy(it.value);
    const h = plot.y + plot.h - top;
    if (h > 0.3) cv.rect(cx - barW / 2, top, barW, h, it.color ?? C.blue, 0.8);
    cv.text(cv.truncate(it.label, slot - 1, 5), cx, plot.y + plot.h + 4, { size: 5, color: C.slate400, align: 'center' });
    if (valueLabels) cv.text(yFormat(it.value), cx, top - 1.5, { size: 5, bold: true, color: C.slate700, align: 'center' });
  });
};

/** Ranked horizontal bars — the clearest form for "top N by cost/count". */
export const barChart = (
  cv: Canvas,
  box: Box,
  items: Array<{ label: string; value: number; color?: RGB }>,
  o: { format?: (v: number) => string; labelW?: number } = {}
) => {
  const { format = (v) => money(v), labelW = 42 } = o;
  if (items.length === 0) return empty(cv, box);
  const max = Math.max(...items.map((i) => i.value), 1);
  const rowH = Math.min(7.5, box.h / items.length);
  const barH = Math.min(4.2, rowH - 2);
  const valueW = 20;
  const trackW = box.w - labelW - valueW;

  items.forEach((it, i) => {
    const y = box.y + i * rowH;
    cv.text(cv.truncate(it.label, labelW - 2, 5.6), box.x, y + barH, { size: 5.6, color: C.slate700 });
    cv.rect(box.x + labelW, y + 0.6, trackW, barH, C.slate100, 0.6);
    const w = Math.max(0.4, (trackW * it.value) / max);
    cv.rect(box.x + labelW, y + 0.6, w, barH, it.color ?? C.blue, 0.6);
    cv.text(format(it.value), box.x + box.w, y + barH, { size: 5.6, bold: true, color: C.slate700, align: 'right' });
  });
};

/** Donut with an on-side legend showing value and share. */
export const donut = (
  cv: Canvas,
  box: Box,
  items: Array<{ label: string; value: number }>,
  o: { format?: (v: number) => string; centerLabel?: string; centerValue?: string } = {}
) => {
  const { format = (v) => money(v), centerLabel, centerValue } = o;
  const data = items.filter((i) => i.value > 0);
  if (data.length === 0) return empty(cv, box);
  const total = data.reduce((s, i) => s + i.value, 0);
  // Radius is bounded by the card width too, so a narrow card leaves the
  // legend enough room to print full labels rather than "...".
  const r = Math.max(9, Math.min(box.h / 2 - 2, box.w * 0.26, 20));
  const cx = box.x + r + 1;
  // Anchor to the top so the ring lines up with the legend in tall cards.
  const cy = box.y + r + 2;

  let angle = -90;
  data.forEach((it, i) => {
    const sweep = (it.value / total) * 360;
    cv.arc(cx, cy, r, r * 0.58, angle, angle + sweep - 0.6, SERIES[i % SERIES.length]);
    angle += sweep;
  });

  if (centerValue) cv.text(centerValue, cx, cy + 0.5, { size: 8, bold: true, color: C.ink, align: 'center' });
  if (centerLabel) cv.text(centerLabel, cx, cy + 4.2, { size: 4.6, color: C.slate400, align: 'center' });

  // Legend — measure each value so the label gets exactly the leftover width.
  const lx = cx + r + 5;
  const lw = box.x + box.w - lx;
  const rowH = Math.min(6, Math.max(4.2, (box.h - 4) / Math.max(data.length, 1)));
  data.forEach((it, i) => {
    const y = box.y + 4 + i * rowH;
    const valueText = `${format(it.value)}  ${pct((it.value / total) * 100)}`;
    cv.pdf.setFontSize(5.5);
    cv.pdf.setFont('helvetica', 'bold');
    const valueW = cv.pdf.getTextWidth(valueText);
    cv.rect(lx, y - 2, 2.4, 2.4, SERIES[i % SERIES.length], 0.4);
    cv.text(it.label, lx + 4, y, { size: 5.5, color: C.slate700, maxWidth: Math.max(6, lw - valueW - 7) });
    cv.text(valueText, box.x + box.w, y, { size: 5.5, bold: true, color: C.slate700, align: 'right' });
  });
};

/** Horizontal pass/fail bars — used for regulatory framework coverage. */
export const stackedBars = (
  cv: Canvas,
  box: Box,
  items: Array<{ label: string; passed: number; failed: number }>
) => {
  if (items.length === 0) return empty(cv, box);
  const labelW = 52;
  const pctW = 16;
  const trackW = box.w - labelW - pctW;
  const rowH = Math.min(9, box.h / items.length);
  items.forEach((it, i) => {
    const total = it.passed + it.failed || 1;
    const y = box.y + i * rowH;
    const share = (it.passed / total) * 100;
    cv.text(cv.truncate(it.label, labelW - 2, 5.6), box.x, y + 4, { size: 5.6, color: C.slate700 });
    cv.rect(box.x + labelW, y + 1, trackW, 4, C.red50, 0.6);
    cv.rect(box.x + labelW, y + 1, Math.max(0.4, (trackW * it.passed) / total), 4, C.green, 0.6);
    cv.text(pct(share), box.x + box.w, y + 4, { size: 5.6, bold: true, color: share >= 80 ? C.green : share >= 60 ? C.amber : C.red, align: 'right' });
    cv.text(`${it.passed}/${total} controls`, box.x + labelW, y + 8, { size: 4.8, color: C.slate400 });
  });
};

/** Utilization meter row (quotas): current vs limit with a colored fill. */
export const meters = (
  cv: Canvas,
  box: Box,
  items: Array<{ label: string; current: number; limit: number }>
) => {
  if (items.length === 0) return empty(cv, box);
  const rowH = Math.min(8.5, box.h / items.length);
  items.forEach((it, i) => {
    const y = box.y + i * rowH;
    const share = it.limit > 0 ? (it.current / it.limit) * 100 : 0;
    const col = share >= 90 ? C.red : share >= 75 ? C.amber : C.green;
    cv.text(cv.truncate(it.label, box.w - 40, 5.6), box.x, y + 3.5, { size: 5.6, color: C.slate700 });
    cv.text(`${it.current} / ${it.limit}`, box.x + box.w, y + 3.5, { size: 5.4, bold: true, color: col, align: 'right' });
    cv.rect(box.x, y + 4.8, box.w, 2.2, C.slate100, 0.5);
    cv.rect(box.x, y + 4.8, Math.max(0.4, (box.w * Math.min(share, 100)) / 100), 2.2, col, 0.5);
  });
};

export interface Column {
  header: string;
  width: number;
  align?: 'left' | 'right';
  /** Render the cell as a colored pill (severity, status). */
  badge?: boolean;
  color?: (row: any) => RGB;
}

/** Zebra-striped table with optional badge columns. Returns the ending y. */
export const table = (
  cv: Canvas,
  box: Box,
  columns: Column[],
  rows: Array<Record<string, any>>,
  keys: string[]
): number => {
  const headerH = 5.5;
  const rowH = 5.4;
  let y = box.y;

  cv.rect(box.x, y, box.w, headerH, C.slate50, 0.8);
  let cx = box.x + 2;
  columns.forEach((c) => {
    cv.text(c.header.toUpperCase(), c.align === 'right' ? cx + c.width - 2 : cx, y + 3.8, {
      size: 5,
      bold: true,
      color: C.slate500,
      align: c.align === 'right' ? 'right' : 'left',
    });
    cx += c.width;
  });
  y += headerH + 0.8;

  const maxRows = Math.floor((box.h - headerH - 1) / rowH);
  const shown = rows.slice(0, Math.max(0, maxRows));

  if (shown.length === 0) {
    cv.text('No records returned for this section.', box.x + 2, y + 4, { size: 5.6, color: C.slate400 });
    return y + 6;
  }

  shown.forEach((row, i) => {
    if (i % 2 === 1) cv.rect(box.x, y - 0.4, box.w, rowH, C.slate50);
    let x = box.x + 2;
    columns.forEach((c, ci) => {
      const raw = row[keys[ci]];
      const val = raw === undefined || raw === null ? '—' : String(raw);
      if (c.badge) {
        const col = c.color ? c.color(row) : C.slate500;
        const tw = Math.min(c.width - 3, cv.pdf.getTextWidth(val) + 3);
        cv.rect(x, y - 0.2, tw, 3.6, col, 0.8);
        cv.text(val, x + 1.5, y + 2.5, { size: 4.8, bold: true, color: C.white, maxWidth: tw - 3 });
      } else {
        cv.text(val, c.align === 'right' ? x + c.width - 2 : x, y + 2.8, {
          size: 5.4,
          color: C.slate700,
          align: c.align === 'right' ? 'right' : 'left',
          maxWidth: c.width - 3,
        });
      }
      x += c.width;
    });
    y += rowH;
  });

  if (rows.length > shown.length) {
    cv.text(`+ ${rows.length - shown.length} more not shown`, box.x + 2, y + 3, { size: 5, color: C.slate400 });
    y += 4;
  }
  return y;
};

export const empty = (cv: Canvas, box: Box) => {
  cv.text('No data available for this section.', box.x + box.w / 2, box.y + box.h / 2, {
    size: 5.8,
    color: C.slate400,
    align: 'center',
  });
};

/** Callout strip used for findings and recommendations. */
export const callout = (cv: Canvas, box: Box, tone: RGB, bg: RGB, title: string, body: string) => {
  cv.rect(box.x, box.y, box.w, box.h, bg, 1.5);
  cv.rect(box.x, box.y, 1.2, box.h, tone, 0.6);
  cv.text(title, box.x + 4, box.y + 4.5, { size: 6, bold: true, color: tone, maxWidth: box.w - 6 });
  const lines = cv.wrap(body, box.w - 7, 5.4).slice(0, 2);
  lines.forEach((l, i) => cv.text(l, box.x + 4, box.y + 8.5 + i * 3.4, { size: 5.4, color: C.slate700 }));
};
