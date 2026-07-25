import { jsPDF } from 'jspdf';

export type RGB = [number, number, number];

// ── Palette ──────────────────────────────────────────────────────────
export const C = {
  ink: [15, 23, 42] as RGB,
  slate700: [51, 65, 85] as RGB,
  slate500: [100, 116, 139] as RGB,
  slate400: [148, 163, 184] as RGB,
  slate200: [226, 232, 240] as RGB,
  slate100: [241, 245, 249] as RGB,
  slate50: [248, 250, 252] as RGB,
  white: [255, 255, 255] as RGB,
  blue: [37, 99, 235] as RGB,
  blueLight: [147, 197, 253] as RGB,
  blue50: [239, 246, 255] as RGB,
  green: [22, 163, 74] as RGB,
  green50: [240, 253, 244] as RGB,
  red: [220, 38, 38] as RGB,
  red50: [254, 242, 242] as RGB,
  amber: [217, 119, 6] as RGB,
  amber50: [255, 251, 235] as RGB,
  violet: [124, 58, 237] as RGB,
  teal: [13, 148, 136] as RGB,
  pink: [219, 39, 119] as RGB,
};

/** Categorical series colors, ordered for maximum adjacent contrast. */
export const SERIES: RGB[] = [C.blue, C.teal, C.amber, C.violet, C.green, C.pink, C.red, C.slate400];

// ── Page geometry (A4 landscape, mm) ─────────────────────────────────
export const PAGE = { w: 297, h: 210, margin: 12, headerH: 17, footerY: 200 };
export const CONTENT = { x: PAGE.margin, w: PAGE.w - PAGE.margin * 2, top: PAGE.headerH + 7, bottom: 194 };

export type Align = 'left' | 'center' | 'right';

/**
 * Thin drawing layer over jsPDF. Everything the report renders goes through
 * here so page furniture, charts and tables share one visual language.
 */
export class Canvas {
  readonly pdf: jsPDF;
  private pageNo = 0;
  private readonly generatedAt: string;
  private readonly subtitle: string;

  constructor(pdf: jsPDF, subtitle: string, generatedAt: string) {
    this.pdf = pdf;
    this.subtitle = subtitle;
    this.generatedAt = generatedAt;
  }

  // ── Text ──
  text(
    str: string,
    x: number,
    y: number,
    o: { size?: number; bold?: boolean; color?: RGB; align?: Align; maxWidth?: number } = {}
  ) {
    const { size = 8, bold = false, color = C.slate700, align = 'left', maxWidth } = o;
    this.pdf.setFontSize(size);
    this.pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    this.pdf.setTextColor(...color);
    const out = maxWidth ? this.truncate(str, maxWidth, size, bold) : str;
    this.pdf.text(out, x, y, { align });
    return this;
  }

  /** Truncate with an ellipsis so long Azure resource names never overrun a column. */
  truncate(str: string, maxWidth: number, size: number, bold = false): string {
    this.pdf.setFontSize(size);
    this.pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    if (this.pdf.getTextWidth(str) <= maxWidth) return str;
    let s = str;
    while (s.length > 1 && this.pdf.getTextWidth(s + '...') > maxWidth) s = s.slice(0, -1);
    return s + '...';
  }

  wrap(str: string, maxWidth: number, size: number): string[] {
    this.pdf.setFontSize(size);
    this.pdf.setFont('helvetica', 'normal');
    return this.pdf.splitTextToSize(str, maxWidth) as string[];
  }

  // ── Shapes ──
  rect(x: number, y: number, w: number, h: number, fill: RGB, r = 0) {
    this.pdf.setFillColor(...fill);
    if (r > 0) this.pdf.roundedRect(x, y, w, h, r, r, 'F');
    else this.pdf.rect(x, y, w, h, 'F');
    return this;
  }

  outlined(x: number, y: number, w: number, h: number, fill: RGB, border: RGB, r = 2) {
    this.pdf.setFillColor(...fill);
    this.pdf.setDrawColor(...border);
    this.pdf.setLineWidth(0.25);
    this.pdf.roundedRect(x, y, w, h, r, r, 'FD');
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.25, dash?: number[]) {
    this.pdf.setDrawColor(...color);
    this.pdf.setLineWidth(width);
    if (dash) this.pdf.setLineDashPattern(dash, 0);
    this.pdf.line(x1, y1, x2, y2);
    if (dash) this.pdf.setLineDashPattern([], 0);
    return this;
  }

  /** Filled polygon from absolute points, expressed to jsPDF as deltas. */
  polygon(points: Array<[number, number]>, fill: RGB) {
    if (points.length < 3) return this;
    const deltas: number[][] = [];
    for (let i = 1; i < points.length; i++) {
      deltas.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
    }
    this.pdf.setFillColor(...fill);
    this.pdf.lines(deltas, points[0][0], points[0][1], [1, 1], 'F', true);
    return this;
  }

  polyline(points: Array<[number, number]>, color: RGB, width = 0.7, dash?: number[]) {
    for (let i = 1; i < points.length; i++) {
      this.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], color, width, dash);
    }
    return this;
  }

  /**
   * Filled ring segment. jsPDF has no arc primitive, so approximate the band
   * between two radii with a polygon dense enough to read as a smooth curve.
   */
  arc(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number, fill: RGB) {
    const sweep = Math.abs(a1 - a0);
    const steps = Math.max(6, Math.ceil(sweep / 3));
    const pts: Array<[number, number]> = [];
    const at = (r: number, a: number): [number, number] => [
      cx + r * Math.cos((a * Math.PI) / 180),
      cy + r * Math.sin((a * Math.PI) / 180),
    ];
    for (let i = 0; i <= steps; i++) pts.push(at(rOuter, a0 + ((a1 - a0) * i) / steps));
    for (let i = steps; i >= 0; i--) pts.push(at(rInner, a0 + ((a1 - a0) * i) / steps));
    return this.polygon(pts, fill);
  }

  // ── Page furniture ──
  newPage(title: string, eyebrow: string) {
    if (this.pageNo > 0) this.pdf.addPage();
    this.pageNo++;
    this.rect(0, 0, PAGE.w, PAGE.headerH, C.ink);
    this.text('Overclouded', PAGE.margin, 7.5, { size: 11, bold: true, color: C.white });
    this.text('Cloud Intelligence Report', PAGE.margin, 12.5, { size: 6.5, color: C.slate400 });
    this.text(title.toUpperCase(), PAGE.w / 2, 8.5, { size: 9.5, bold: true, color: C.white, align: 'center' });
    this.text(eyebrow, PAGE.w / 2, 13, { size: 6, color: C.slate400, align: 'center' });
    this.text(this.subtitle, PAGE.w - PAGE.margin, 8.5, { size: 6.5, color: C.slate200, align: 'right' });
    this.text(this.generatedAt, PAGE.w - PAGE.margin, 12.5, { size: 6, color: C.slate400, align: 'right' });
    return this;
  }

  /** Footers are stamped at the end, once the total page count is known. */
  stampFooters() {
    const total = this.pdf.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.pdf.setPage(p);
      this.line(PAGE.margin, PAGE.footerY - 3.5, PAGE.w - PAGE.margin, PAGE.footerY - 3.5, C.slate200, 0.25);
      this.text('Overclouded — generated from live Azure Resource Manager APIs. No customer data is retained.', PAGE.margin, PAGE.footerY, { size: 5.5, color: C.slate400 });
      this.text(`Page ${p} of ${total}`, PAGE.w - PAGE.margin, PAGE.footerY, { size: 5.5, color: C.slate400, align: 'right' });
    }
    return this;
  }

  get page() {
    return this.pageNo;
  }
}

// ── Formatting ───────────────────────────────────────────────────────
export const money = (v: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: decimals }).format(v || 0);

/** Compact currency for axis ticks: $12.4K, $1.2M. */
export const moneyShort = (v: number) => {
  const n = Math.abs(v);
  if (n >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Math.round(v)}`;
};

export const num = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);
export const pct = (v: number, decimals = 0) => `${(v ?? 0).toFixed(decimals)}%`;

/** Score → semantic color, shared by gauges, badges and score text. */
export const scoreColor = (v: number, good = 80, fair = 60): RGB =>
  v >= good ? C.green : v >= fair ? C.amber : C.red;

export const severityColor = (s: string): RGB =>
  s === 'High' || s === 'Failed' || s === 'Unavailable' ? C.red
    : s === 'Medium' || s === 'Warning' || s === 'Degraded' ? C.amber
    : s === 'Low' ? C.blue
    : C.green;

export const tint = (c: RGB): RGB =>
  c === C.red ? C.red50 : c === C.amber ? C.amber50 : c === C.green ? C.green50 : C.blue50;

/** "Nice" axis maximum so gridlines land on round numbers. */
export const niceMax = (v: number): number => {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
};
