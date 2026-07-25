import { jsPDF } from 'jspdf';
import { DashboardData } from '../../types';
import { Canvas, C, CONTENT, PAGE, RGB, money, moneyShort, num, pct, scoreColor, severityColor } from './primitives';
import { Box, barChart, callout, card, columnChart, donut, empty, gauge, kpi, lineChart, meters, stackedBars, table } from './charts';
import { deriveFindings, Finding } from './findings';

const GAP = 4;

/** Split a width into n equal columns separated by GAP. */
const cols = (x: number, w: number, n: number, gap = GAP) => {
  const cw = (w - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: x + i * (cw + gap), w: cw }));
};

const severityFill = (s: string): RGB => severityColor(s);

export const buildReport = (data: DashboardData): jsPDF => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const subName = data.executive?.subscriptionName || 'Azure Subscription';
  const cv = new Canvas(pdf, `${subName} · ${data.subscriptionId}`, generatedAt);
  const findings = deriveFindings(data);

  const cost = data.cost;
  const sec = data.security;
  const gov = data.governance;
  const mon = data.monitoring;
  const rec = data.recommendations;
  const iam = data.iamExtended;

  const modeBadge = data.isRealData ? 'LIVE AZURE DATA' : 'DEMONSTRATION DATA';

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 1 — Executive Summary
  // ═══════════════════════════════════════════════════════════════════
  cv.newPage('Executive Summary', modeBadge);
  let y = CONTENT.top;

  const k = cols(CONTENT.x, CONTENT.w, 6);
  const budgetDelta = (cost?.forecastedCost || 0) - (cost?.budget || 0);
  kpi(cv, { ...k[0], y, h: 19 }, 'Month to date', money(cost?.currentMonthCost || 0), C.ink, C.slate50,
    cost?.monthOverMonthChange !== undefined
      // Built-in PDF fonts are WinAnsi — arrows and other geometric glyphs
      // rasterise as mojibake, so stick to ASCII signs.
      ? { text: `${cost.monthOverMonthChange >= 0 ? '+' : '-'}${pct(Math.abs(cost.monthOverMonthChange), 1)} MoM`, good: cost.monthOverMonthChange < 0 }
      : undefined);
  kpi(cv, { ...k[1], y, h: 19 }, 'Forecast', money(cost?.forecastedCost || 0), C.blue, C.blue50,
    { text: budgetDelta > 0 ? `${money(budgetDelta)} over budget` : `${money(-budgetDelta)} under budget`, good: budgetDelta <= 0 });
  kpi(cv, { ...k[2], y, h: 19 }, 'Recoverable / mo', money(cost?.potentialSavings || 0), C.green, C.green50,
    { text: `${pct(cost?.riCoverage || 0)} RI coverage`, good: (cost?.riCoverage || 0) >= 60 });
  kpi(cv, { ...k[3], y, h: 19 }, 'Secure score', pct(sec?.score || 0), scoreColor(sec?.score || 0), C.slate50,
    { text: `${sec?.criticalVulnerabilities || 0} critical findings`, good: (sec?.criticalVulnerabilities || 0) === 0 });
  kpi(cv, { ...k[4], y, h: 19 }, 'Resources', num(data.executive?.totalResources || 0), C.ink, C.slate50,
    { text: `${gov?.zombieAssets || 0} idle assets`, good: (gov?.zombieAssets || 0) === 0 });
  kpi(cv, { ...k[5], y, h: 19 }, 'Uptime', pct(mon?.uptime || 0, 2), (mon?.uptime || 0) >= 99.9 ? C.green : C.amber, C.slate50,
    { text: `${mon?.vmCount || 0} virtual machines`, good: true });

  y += 19 + GAP;

  // Posture gauges + cost trend
  const [left, right] = [{ x: CONTENT.x, w: 104 }, { x: CONTENT.x + 108, w: CONTENT.w - 108 }];
  const gBox = card(cv, { ...left, y, h: 54 }, 'Posture Scores');
  const gy = gBox.y + 16;
  const gauges: Array<[string, number]> = [
    ['Security', sec?.score || 0],
    ['Governance', gov?.healthScore || 0],
    ['Efficiency', rec?.efficiencyScore || 0],
    ['Compliance', sec?.complianceScore || 0],
  ];
  // Distribute across the card so the last gauge and its label stay inside.
  gauges.forEach(([label, value], i) => {
    const cx = gBox.x + (gBox.w * (i + 0.5)) / gauges.length;
    gauge(cv, cx, gy, 10.5, value, scoreColor(value), label);
  });

  const trendBox = card(cv, { ...right, y, h: 54 }, 'Daily Spend — Actual vs Forecast', 'against daily budget pace');
  renderCostTrend(cv, trendBox, data);

  y += 54 + GAP;

  // Findings + top risks
  const fBox = card(cv, { x: CONTENT.x, w: 133, y, h: CONTENT.bottom - y }, 'Key Findings', `${findings.length} identified`);
  const topFindings = findings.slice(0, 5);
  if (topFindings.length === 0) empty(cv, fBox);
  topFindings.forEach((f, i) => {
    const h = (fBox.h - (topFindings.length - 1) * 2) / topFindings.length;
    callout(cv, { x: fBox.x, y: fBox.y + i * (h + 2), w: fBox.w, h }, severityFill(f.severity === 'Critical' ? 'High' : f.severity),
      f.severity === 'Critical' || f.severity === 'High' ? C.red50 : f.severity === 'Medium' ? C.amber50 : C.blue50,
      `${f.severity.toUpperCase()} · ${f.area} — ${f.title}`, f.detail);
  });

  const rBox = card(cv, { x: CONTENT.x + 137, w: CONTENT.w - 137, y, h: CONTENT.bottom - y }, 'Prioritised Remediation Register');
  table(cv, rBox,
    [
      { header: 'Sev', width: 15, badge: true, color: (r) => severityFill(r.severity === 'Critical' ? 'High' : r.severity) },
      { header: 'Area', width: 22 },
      { header: 'Finding', width: rBox.w - 82 },
      { header: 'Impact / mo', width: 24, align: 'right' },
    ],
    findings.map((f) => ({
      severity: f.severity,
      area: f.area,
      title: f.title,
      impact: f.impact ? money(f.impact) : '—',
    })),
    ['severity', 'area', 'title', 'impact']
  );

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 2 — Cost & FinOps
  // ═══════════════════════════════════════════════════════════════════
  cv.newPage('Cost & FinOps Analysis', 'Spend distribution, trend and variance');
  y = CONTENT.top;

  const c2 = cols(CONTENT.x, CONTENT.w, 6);
  kpi(cv, { ...c2[0], y, h: 17 }, 'Month to date', money(cost?.currentMonthCost || 0), C.ink, C.slate50);
  kpi(cv, { ...c2[1], y, h: 17 }, 'Forecast', money(cost?.forecastedCost || 0), C.blue, C.blue50);
  kpi(cv, { ...c2[2], y, h: 17 }, 'Budget', money(cost?.budget || 0), C.slate700, C.slate50);
  kpi(cv, { ...c2[3], y, h: 17 }, 'Variance', money(budgetDelta), budgetDelta > 0 ? C.red : C.green, budgetDelta > 0 ? C.red50 : C.green50);
  kpi(cv, { ...c2[4], y, h: 17 }, 'MoM change', pct(cost?.monthOverMonthChange || 0, 1), (cost?.monthOverMonthChange || 0) > 0 ? C.red : C.green, C.slate50);
  kpi(cv, { ...c2[5], y, h: 17 }, 'RI coverage', pct(cost?.riCoverage || 0), C.violet, C.slate50);
  y += 17 + GAP;

  const trend2 = card(cv, { x: CONTENT.x, w: CONTENT.w, y, h: 56 }, 'Daily Spend Trend with Month-End Forecast', 'dashed = projected');
  renderCostTrend(cv, trend2, data);
  y += 56 + GAP;

  const bot = cols(CONTENT.x, CONTENT.w, 3);
  const h3 = CONTENT.bottom - y;
  const svcBox = card(cv, { ...bot[0], y, h: h3 }, 'Cost by Service');
  donut(cv, svcBox, (cost?.costByService || []).slice(0, 6).map((s) => ({ label: s.name, value: s.value })), {
    centerValue: moneyShort(cost?.currentMonthCost || 0),
    centerLabel: 'MTD',
  });

  const rgBox = card(cv, { ...bot[1], y, h: h3 }, 'Cost by Resource Group');
  barChart(cv, rgBox, (cost?.costByResourceGroup || []).slice(0, 8).map((r) => ({ label: r.name, value: r.value })), { labelW: 38 });

  const regBox = card(cv, { ...bot[2], y, h: h3 }, 'Cost by Region');
  barChart(cv, regBox, (cost?.costByRegion || []).slice(0, 8).map((r) => ({ label: r.name, value: r.value })), { labelW: 38 });

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 3 — Optimisation & Savings
  // ═══════════════════════════════════════════════════════════════════
  cv.newPage('Optimisation & Savings', 'Actionable cost reduction opportunities');
  y = CONTENT.top;

  const savingsByCat = groupSavings(rec?.items || []);
  const orphaned = gov?.orphanedResources || [];
  const orphanTotal = orphaned.reduce((s, r) => s + (r.estimatedMonthlyCost || 0), 0);
  const annualised = (cost?.potentialSavings || 0) * 12;

  const c3 = cols(CONTENT.x, CONTENT.w, 4);
  kpi(cv, { ...c3[0], y, h: 18 }, 'Monthly opportunity', money(cost?.potentialSavings || 0), C.green, C.green50);
  kpi(cv, { ...c3[1], y, h: 18 }, 'Annualised', money(annualised), C.green, C.green50);
  kpi(cv, { ...c3[2], y, h: 18 }, 'Idle resource cost', money(orphanTotal), C.amber, C.amber50);
  kpi(cv, { ...c3[3], y, h: 18 }, 'Efficiency score', pct(rec?.efficiencyScore || 0), scoreColor(rec?.efficiencyScore || 0), C.slate50);
  y += 18 + GAP;

  const optTop = cols(CONTENT.x, CONTENT.w, 2);
  const catBox = card(cv, { ...optTop[0], y, h: 52 }, 'Savings by Category');
  columnChart(cv, catBox, savingsByCat.map((s, i) => ({ label: s.category, value: s.total })), { yFormat: moneyShort });

  const impactBox = card(cv, { ...optTop[1], y, h: 52 }, 'Recommendations by Impact');
  const byImpact = ['High', 'Medium', 'Low'].map((lvl) => ({
    label: lvl,
    value: (rec?.items || []).filter((i) => i.impact === lvl).length,
    color: lvl === 'High' ? C.red : lvl === 'Medium' ? C.amber : C.blue,
  }));
  columnChart(cv, impactBox, byImpact, { yFormat: (v) => String(Math.round(v)) });
  y += 52 + GAP;

  const optBot = cols(CONTENT.x, CONTENT.w, 2);
  const recBox = card(cv, { ...optBot[0], y, h: CONTENT.bottom - y }, 'Advisor Recommendations', `${(rec?.items || []).length} items`);
  table(cv, recBox,
    [
      { header: 'Impact', width: 17, badge: true, color: (r) => severityFill(r.impact) },
      { header: 'Category', width: 20 },
      { header: 'Recommendation', width: recBox.w - 62 },
      { header: 'Saving', width: 21, align: 'right' },
    ],
    (rec?.items || []).map((i) => ({
      impact: i.impact, category: i.category, description: i.description,
      savings: i.savings ? money(i.savings) : '—',
    })),
    ['impact', 'category', 'description', 'savings']
  );

  const orphBox = card(cv, { ...optBot[1], y, h: CONTENT.bottom - y }, 'Orphaned Resources', `${money(orphanTotal)}/mo recoverable`);
  table(cv, orphBox,
    [
      { header: 'Resource', width: orphBox.w - 62 },
      { header: 'Type', width: 38 },
      { header: 'Cost / mo', width: 24, align: 'right' },
    ],
    orphaned.map((r) => ({ name: r.name, type: r.type, cost: money(r.estimatedMonthlyCost) })),
    ['name', 'type', 'cost']
  );

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 4 — Security Posture
  // ═══════════════════════════════════════════════════════════════════
  cv.newPage('Security Posture', 'Threats, exposure and control coverage');
  y = CONTENT.top;

  const s4 = cols(CONTENT.x, CONTENT.w, 6);
  kpi(cv, { ...s4[0], y, h: 17 }, 'Secure score', pct(sec?.score || 0), scoreColor(sec?.score || 0), C.slate50);
  kpi(cv, { ...s4[1], y, h: 17 }, 'Active threats', num(sec?.activeThreats || 0), (sec?.activeThreats || 0) > 0 ? C.red : C.green, (sec?.activeThreats || 0) > 0 ? C.red50 : C.green50);
  kpi(cv, { ...s4[2], y, h: 17 }, 'Critical vulns', num(sec?.criticalVulnerabilities || 0), (sec?.criticalVulnerabilities || 0) > 0 ? C.red : C.green, (sec?.criticalVulnerabilities || 0) > 0 ? C.red50 : C.green50);
  kpi(cv, { ...s4[3], y, h: 17 }, 'Open NSG rules', num(sec?.networkSecurity?.openNsgRules || 0), C.amber, C.amber50);
  kpi(cv, { ...s4[4], y, h: 17 }, 'Public IPs', num(sec?.networkSecurity?.publicIps || 0), C.amber, C.amber50);
  kpi(cv, { ...s4[5], y, h: 17 }, 'Unencrypted', num(sec?.encryptionStatus?.unencryptedResources || 0), (sec?.encryptionStatus?.unencryptedResources || 0) > 0 ? C.red : C.green, C.slate50);
  y += 17 + GAP;

  const sTop = cols(CONTENT.x, CONTENT.w, 2);
  const compBox = card(cv, { ...sTop[0], y, h: 58 }, 'Regulatory Compliance Coverage');
  stackedBars(cv, compBox, (sec?.regulatoryCompliance || []).map((r) => ({
    label: r.framework, passed: r.passedControls, failed: r.failedControls,
  })));

  const encBox = card(cv, { ...sTop[1], y, h: 58 }, 'Encryption & Key Vault Posture');
  const encInner = cols(encBox.x, encBox.w, 2);
  donut(cv, { ...encInner[0], y: encBox.y, h: encBox.h }, [
    { label: 'Encrypted', value: sec?.encryptionStatus?.encryptedResources || 0 },
    { label: 'Unencrypted', value: sec?.encryptionStatus?.unencryptedResources || 0 },
  ], { format: (v) => num(v) });
  const kvY = encBox.y + 4;
  const kvRows: Array<[string, number, RGB]> = [
    ['Secrets stored', sec?.keyVaultHealth?.totalSecrets || 0, C.slate700],
    ['Secrets expiring', sec?.keyVaultHealth?.expiringSecrets || 0, C.red],
    ['Certificates stored', sec?.keyVaultHealth?.totalCertificates || 0, C.slate700],
    ['Certificates expiring', sec?.keyVaultHealth?.expiringCertificates || 0, C.red],
    ['Unprotected endpoints', sec?.networkSecurity?.unprotectedEndpoints || 0, C.amber],
  ];
  kvRows.forEach(([label, val, col], i) => {
    const ry = kvY + i * 8;
    cv.text(label, encInner[1].x, ry + 4, { size: 5.8, color: C.slate700 });
    cv.text(num(val), encInner[1].x + encInner[1].w, ry + 4, { size: 7, bold: true, color: col, align: 'right' });
    cv.line(encInner[1].x, ry + 6, encInner[1].x + encInner[1].w, ry + 6, C.slate100, 0.2);
  });
  y += 58 + GAP;

  const alertBox = card(cv, { x: CONTENT.x, w: CONTENT.w, y, h: CONTENT.bottom - y }, 'Security Alerts', `${(sec?.alerts || []).length} open`);
  table(cv, alertBox,
    [
      { header: 'Severity', width: 20, badge: true, color: (r) => severityFill(r.severity) },
      { header: 'Detected', width: 26 },
      { header: 'Description', width: alertBox.w - 46 },
    ],
    (sec?.alerts || []).map((a) => ({ severity: a.severity, time: a.time, description: a.description })),
    ['severity', 'time', 'description']
  );

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 5 — Governance & Compliance
  // ═══════════════════════════════════════════════════════════════════
  cv.newPage('Governance & Compliance', 'Policy, inventory and quota health');
  y = CONTENT.top;

  const g5 = cols(CONTENT.x, CONTENT.w, 5);
  kpi(cv, { ...g5[0], y, h: 17 }, 'Health score', pct(gov?.healthScore || 0), scoreColor(gov?.healthScore || 0), C.slate50);
  kpi(cv, { ...g5[1], y, h: 17 }, 'Policy violations', num(gov?.policyViolations || 0), (gov?.policyViolations || 0) > 0 ? C.red : C.green, C.slate50);
  kpi(cv, { ...g5[2], y, h: 17 }, 'Tagging compliance', pct(gov?.taggingCompliance || 0), scoreColor(gov?.taggingCompliance || 0, 90, 70), C.slate50);
  kpi(cv, { ...g5[3], y, h: 17 }, 'Naming compliance', pct(gov?.namingCompliancePercent || 0), scoreColor(gov?.namingCompliancePercent || 0, 90, 70), C.slate50);
  kpi(cv, { ...g5[4], y, h: 17 }, 'Idle assets', num(gov?.zombieAssets || 0), (gov?.zombieAssets || 0) > 0 ? C.amber : C.green, C.slate50);
  y += 17 + GAP;

  const gTop = cols(CONTENT.x, CONTENT.w, 3);
  const typeBox = card(cv, { ...gTop[0], y, h: 56 }, 'Inventory by Resource Type');
  donut(cv, typeBox, (gov?.resourcesByType || []).slice(0, 6).map((r) => ({ label: r.type, value: r.count })), {
    format: (v) => num(v),
    centerValue: num(data.executive?.totalResources || 0),
    centerLabel: 'total',
  });

  const regionBox = card(cv, { ...gTop[1], y, h: 56 }, 'Inventory by Region');
  barChart(cv, regionBox, (gov?.resourcesByRegion || []).slice(0, 7).map((r) => ({ label: r.region, value: r.count })), {
    format: (v) => num(v), labelW: 34,
  });

  const quotaBox = card(cv, { ...gTop[2], y, h: 56 }, 'Subscription Quota Utilisation');
  meters(cv, quotaBox, (gov?.subscriptionQuotas || []).slice(0, 6).map((q) => ({ label: q.name, current: q.currentUsage, limit: q.limit })));
  y += 56 + GAP;

  const polBox = card(cv, { x: CONTENT.x, w: CONTENT.w, y, h: CONTENT.bottom - y }, 'Azure Policy Assessment');
  table(cv, polBox,
    [
      { header: 'Status', width: 18, badge: true, color: (r) => severityFill(r.status) },
      { header: 'Severity', width: 18, badge: true, color: (r) => severityFill(r.severity) },
      { header: 'Policy', width: polBox.w - 66 },
      { header: 'Affected', width: 22, align: 'right' },
    ],
    (gov?.policies || []).map((p) => ({ status: p.status, severity: p.severity, name: p.name, affected: num(p.affectedResources) })),
    ['status', 'severity', 'name', 'affected']
  );

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 6 — Operations & Reliability
  // ═══════════════════════════════════════════════════════════════════
  cv.newPage('Operations & Reliability', 'Utilisation, availability and SLA attainment');
  y = CONTENT.top;

  const o6 = cols(CONTENT.x, CONTENT.w, 5);
  kpi(cv, { ...o6[0], y, h: 17 }, 'Uptime', pct(mon?.uptime || 0, 2), (mon?.uptime || 0) >= 99.9 ? C.green : C.amber, C.slate50);
  kpi(cv, { ...o6[1], y, h: 17 }, 'Virtual machines', num(mon?.vmCount || 0), C.blue, C.blue50);
  kpi(cv, { ...o6[2], y, h: 17 }, 'Storage used', `${mon?.storageUsedTB || 0} TB`, C.violet, C.slate50);
  kpi(cv, { ...o6[3], y, h: 17 }, 'Active users', num(mon?.activeUsers || 0), C.ink, C.slate50);
  kpi(cv, { ...o6[4], y, h: 17 }, 'Unprotected', num(mon?.backupCoverage?.unprotectedResources || 0),
    (mon?.backupCoverage?.unprotectedResources || 0) > 0 ? C.red : C.green, C.slate50);
  y += 17 + GAP;

  const util = cols(CONTENT.x, CONTENT.w, 3);
  const cpuBox = card(cv, { ...util[0], y, h: 48 }, 'CPU Utilisation', '%');
  renderSeries(cv, cpuBox, mon?.cpuUsageHistory || [], C.blue);
  const memBox = card(cv, { ...util[1], y, h: 48 }, 'Memory Utilisation', '%');
  renderSeries(cv, memBox, mon?.memoryUsageHistory || [], C.violet);
  const iopsBox = card(cv, { ...util[2], y, h: 48 }, 'Disk IOPS', 'ops/s');
  renderSeries(cv, iopsBox, mon?.diskIops || [], C.amber, false);
  y += 48 + GAP;

  const oBot = cols(CONTENT.x, CONTENT.w, 3);
  const slaBox = card(cv, { ...oBot[0], y, h: CONTENT.bottom - y }, 'SLA Attainment');
  table(cv, slaBox,
    [
      { header: 'Service', width: slaBox.w - 46 },
      { header: 'Actual', width: 22, align: 'right' },
      { header: 'Status', width: 22, badge: true, color: (r) => (r.status === 'MET' ? C.green : C.red) },
    ],
    (data.executive?.slaTracking || []).map((s) => ({
      service: s.service,
      actual: pct(s.actualUptime, 2),
      status: s.actualUptime >= s.contractualSla ? 'MET' : 'BREACH',
    })),
    ['service', 'actual', 'status']
  );

  const healthBox = card(cv, { ...oBot[1], y, h: CONTENT.bottom - y }, 'Resource Health');
  donut(cv, healthBox, [
    { label: 'Healthy', value: mon?.resourceHealth?.healthy || 0 },
    { label: 'Degraded', value: mon?.resourceHealth?.degraded || 0 },
    { label: 'Unavailable', value: mon?.resourceHealth?.unavailable || 0 },
  ], { format: (v) => num(v) });

  const svcHealthBox = card(cv, { ...oBot[2], y, h: CONTENT.bottom - y }, 'Service Health Advisories');
  table(cv, svcHealthBox,
    [
      { header: 'Service', width: 34 },
      { header: 'State', width: 20, badge: true, color: (r) => severityFill(r.status) },
      { header: 'Summary', width: svcHealthBox.w - 54 },
    ],
    (mon?.serviceHealth || []).map((s) => ({ service: s.service, status: s.status, summary: s.summary })),
    ['service', 'status', 'summary']
  );

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 7 — Identity & Access
  // ═══════════════════════════════════════════════════════════════════
  cv.newPage('Identity & Access', 'Privilege distribution and credential hygiene');
  y = CONTENT.top;

  const assignments = iam?.roleAssignments?.length ? iam.roleAssignments : data.iam || [];
  const byType = ['User', 'Group', 'ServicePrincipal'].map((t) => ({
    label: t === 'ServicePrincipal' ? 'Service Principals' : `${t}s`,
    value: assignments.filter((a) => a.principalType === t).length,
  }));

  const i7 = cols(CONTENT.x, CONTENT.w, 5);
  kpi(cv, { ...i7[0], y, h: 17 }, 'Role assignments', num(assignments.length), C.blue, C.blue50);
  kpi(cv, { ...i7[1], y, h: 17 }, 'Owners', num(iam?.privilegedRoleSummary?.owners || 0),
    (iam?.privilegedRoleSummary?.owners || 0) > 3 ? C.red : C.green, C.slate50);
  kpi(cv, { ...i7[2], y, h: 17 }, 'Service principals', num(iam?.servicePrincipals?.length || 0), C.violet, C.slate50);
  kpi(cv, { ...i7[3], y, h: 17 }, 'Guest users', num(iam?.guestUsers || 0), (iam?.guestUsers || 0) > 0 ? C.amber : C.green, C.slate50);
  kpi(cv, { ...i7[4], y, h: 17 }, 'Stale accounts', num(iam?.staleAccounts || 0), (iam?.staleAccounts || 0) > 0 ? C.red : C.green, C.slate50);
  y += 17 + GAP;

  const iTop = cols(CONTENT.x, CONTENT.w, 2);
  const ptBox = card(cv, { ...iTop[0], y, h: 54 }, 'Assignments by Principal Type');
  donut(cv, ptBox, byType, { format: (v) => num(v), centerValue: num(assignments.length), centerLabel: 'total' });

  const privBox = card(cv, { ...iTop[1], y, h: 54 }, 'Privileged Role Distribution');
  columnChart(cv, privBox, [
    { label: 'Owners', value: iam?.privilegedRoleSummary?.owners || 0, color: C.red },
    { label: 'Contributors', value: iam?.privilegedRoleSummary?.contributors || 0, color: C.amber },
    { label: 'Global Admins', value: iam?.privilegedRoleSummary?.globalAdmins || 0, color: C.violet },
  ], { yFormat: (v) => String(Math.round(v)) });
  y += 54 + GAP;

  const iBot = cols(CONTENT.x, CONTENT.w, 2);
  const raBox = card(cv, { ...iBot[0], y, h: CONTENT.bottom - y }, 'Role Assignments');
  table(cv, raBox,
    [
      { header: 'Principal', width: raBox.w - 74 },
      { header: 'Type', width: 32 },
      { header: 'Role', width: 42 },
    ],
    assignments.map((a) => ({ name: a.principalName || a.principalId, type: a.principalType, role: a.roleName })),
    ['name', 'type', 'role']
  );

  const spBox = card(cv, { ...iBot[1], y, h: CONTENT.bottom - y }, 'Service Principal Credentials');
  table(cv, spBox,
    [
      { header: 'Service principal', width: spBox.w - 76 },
      { header: 'Role', width: 42 },
      { header: 'Expires', width: 34, align: 'right' },
    ],
    (iam?.servicePrincipals || []).map((sp) => ({ name: sp.name, role: sp.roleName, expiry: sp.credentialExpiry })),
    ['name', 'role', 'expiry']
  );

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 8 — Activity & Change
  // ═══════════════════════════════════════════════════════════════════
  cv.newPage('Activity & Change', 'Deployment velocity and control-plane operations');
  y = CONTENT.top;

  const events = data.events || [];
  const failed = events.filter((e) => e.status === 'Failed').length;
  const a8 = cols(CONTENT.x, CONTENT.w, 4);
  kpi(cv, { ...a8[0], y, h: 17 }, 'Logged operations', num(events.length), C.blue, C.blue50);
  kpi(cv, { ...a8[1], y, h: 17 }, 'Failed operations', num(failed), failed > 0 ? C.red : C.green, failed > 0 ? C.red50 : C.green50);
  kpi(cv, { ...a8[2], y, h: 17 }, 'Deployments', num(data.devops?.deployments?.length || 0), C.violet, C.slate50);
  kpi(cv, { ...a8[3], y, h: 17 }, 'Success rate', pct(events.length ? ((events.length - failed) / events.length) * 100 : 100, 1), C.green, C.green50);
  y += 17 + GAP;

  const velBox = card(cv, { x: CONTENT.x, w: CONTENT.w, y, h: 50 }, 'Change Velocity');
  columnChart(cv, velBox, (data.devops?.changeVelocity || []).map((c) => ({ label: c.date, value: c.changes })), {
    yFormat: (v) => String(Math.round(v)),
  });
  y += 50 + GAP;

  const aBot = cols(CONTENT.x, CONTENT.w, 2);
  const evBox = card(cv, { ...aBot[0], y, h: CONTENT.bottom - y }, 'Recent Control-Plane Activity');
  table(cv, evBox,
    [
      { header: 'Status', width: 20, badge: true, color: (r) => severityFill(r.status) },
      { header: 'Operation', width: evBox.w - 78 },
      { header: 'Resource group', width: 34 },
      { header: 'Caller', width: 24 },
    ],
    events.map((e) => ({ status: e.status, op: e.operationName, rg: e.resourceGroup, caller: e.caller })),
    ['status', 'op', 'rg', 'caller']
  );

  const depBox = card(cv, { ...aBot[1], y, h: CONTENT.bottom - y }, 'Deployments & Failure Summary');
  const depEnd = table(cv, { ...depBox, h: depBox.h * 0.55 },
    [
      { header: 'Status', width: 20, badge: true, color: (r) => severityFill(r.status) },
      { header: 'Deployment', width: depBox.w - 74 },
      { header: 'Resource group', width: 32 },
      { header: 'Duration', width: 22, align: 'right' },
    ],
    (data.devops?.deployments || []).map((d) => ({ status: d.status, name: d.name, rg: d.resourceGroup, duration: d.duration })),
    ['status', 'name', 'rg', 'duration']
  );
  const failBox = { x: depBox.x, y: depEnd + 4, w: depBox.w, h: depBox.y + depBox.h - depEnd - 4 };
  if (failBox.h > 12) {
    cv.text('Most frequent failed operations', failBox.x, failBox.y, { size: 6, bold: true, color: C.ink });
    barChart(cv, { ...failBox, y: failBox.y + 3, h: failBox.h - 3 },
      (data.devops?.failedOperationsSummary || []).slice(0, 4).map((o) => ({ label: o.operation, value: o.count, color: C.red })),
      { format: (v) => num(v), labelW: 60 });
  }

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 9 — Methodology
  // ═══════════════════════════════════════════════════════════════════
  cv.newPage('Methodology & Data Sources', 'How this report was produced');
  y = CONTENT.top;

  const mCols = cols(CONTENT.x, CONTENT.w, 2);
  const srcBox = card(cv, { ...mCols[0], y, h: 96 }, 'Azure APIs Queried (read-only)');
  const sources: Array<[string, string]> = [
    ['Subscriptions', '/subscriptions'],
    ['Resources', '/resources'],
    ['Secure score', '/providers/Microsoft.Security/secureScores'],
    ['Security alerts', '/providers/Microsoft.Security/alerts'],
    ['Compliance', '/providers/Microsoft.Security/regulatoryComplianceStandards'],
    ['Cost management', '/providers/Microsoft.CostManagement/query'],
    ['Advisor', '/providers/Microsoft.Advisor/recommendations'],
    ['Policy states', '/providers/Microsoft.PolicyInsights/policyStates'],
    ['Activity log', '/providers/Microsoft.Insights/eventtypes/management/values'],
    ['Metrics', '/providers/Microsoft.Insights/metrics'],
    ['Role assignments', '/providers/Microsoft.Authorization/roleAssignments'],
  ];
  table(cv, srcBox,
    [{ header: 'Dataset', width: 46 }, { header: 'Endpoint', width: srcBox.w - 46 }],
    sources.map(([n, e]) => ({ name: n, endpoint: e })), ['name', 'endpoint']);

  const methBox = card(cv, { ...mCols[1], y, h: 96 }, 'Scoring & Retention');
  const notes = [
    ['Secure score', 'Reported directly by Microsoft Defender for Cloud; not recalculated.'],
    ['Governance health', 'Weighted blend of policy compliance, tagging and naming coverage.'],
    ['Efficiency score', 'Azure Advisor cost posture, expressed as a percentage of ideal.'],
    ['Forecast', 'Month-end projection from observed daily burn, compared with the daily budget pace.'],
    ['Findings', 'Rule-based evaluation of the collected telemetry, ranked by severity then dollar impact.'],
    ['Data retention', 'All figures were held in browser memory for the duration of the session only. Nothing was written to disk or transmitted to any third party.'],
  ];
  let ny = methBox.y + 3;
  notes.forEach(([title, body]) => {
    cv.text(title, methBox.x, ny, { size: 6, bold: true, color: C.ink });
    const lines = cv.wrap(body, methBox.w, 5.4);
    lines.forEach((l, i) => cv.text(l, methBox.x, ny + 3.6 + i * 3.2, { size: 5.4, color: C.slate500 }));
    ny += 6 + lines.length * 3.2;
  });
  y += 96 + GAP;

  const discBox = card(cv, { x: CONTENT.x, w: CONTENT.w, y, h: CONTENT.bottom - y }, 'Scope & Disclaimer');
  const disclaimer = data.isRealData
    ? `This report reflects the state of subscription ${data.subscriptionId} at ${generatedAt}. Figures are point-in-time and derived from read-only Azure Resource Manager queries executed with the signed-in user's own permissions. Sections may be incomplete where the account lacked read access. Cost figures are pre-tax and exclude credits or negotiated discounts unless already applied by Cost Management.`
    : `This report was generated from demonstration data for evaluation purposes. It does not reflect any real Azure environment. Connect a live subscription to produce an authoritative assessment.`;
  cv.wrap(disclaimer, discBox.w, 5.6).forEach((l, i) => cv.text(l, discBox.x, discBox.y + 4 + i * 3.4, { size: 5.6, color: C.slate500 }));

  cv.stampFooters();
  return pdf;
};

// ── Helpers ──────────────────────────────────────────────────────────

/** Cost trend split into actual and forecast, with a daily budget reference. */
function renderCostTrend(cv: Canvas, box: Box, data: DashboardData) {
  const trend = data.cost?.costTrend || [];
  if (trend.length === 0) return empty(cv, box);

  const actual = trend.filter((t) => t.type === 'Actual');
  const forecast = trend.filter((t) => t.type === 'Forecast');
  const categories = trend.map((t) => t.date);

  const series = [
    { points: actual.map((t) => t.value), color: C.blue, fill: true, label: 'Actual' },
  ];
  if (forecast.length > 0) {
    // Start the forecast at the final actual point so the line is continuous.
    const bridge = actual.length ? [actual[actual.length - 1].value, ...forecast.map((t) => t.value)] : forecast.map((t) => t.value);
    series.push({
      points: bridge,
      color: C.blueLight,
      fill: false,
      dashed: true,
      label: 'Forecast',
      offset: Math.max(0, actual.length - 1),
    } as any);
  }

  const dailyBudget = data.cost?.budget ? data.cost.budget / 30 : 0;
  lineChart(cv, box, categories, series as any, {
    yFormat: moneyShort,
    reference: dailyBudget > 0 ? { value: dailyBudget, label: `Daily budget pace ${moneyShort(dailyBudget)}`, color: C.red } : undefined,
  });
}

/** Single-metric time series (CPU, memory, IOPS). */
function renderSeries(cv: Canvas, box: Box, points: Array<{ time: string; value: number }>, color: RGB, percent = true) {
  if (!points || points.length === 0) return empty(cv, box);
  lineChart(cv, box, points.map((p) => p.time), [{ points: points.map((p) => p.value), color, fill: true, label: '' }], {
    yFormat: percent ? (v) => `${Math.round(v)}%` : (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))),
    yMax: percent ? 100 : undefined,
    legend: false,
  });
}

function groupSavings(items: Array<{ category: string; savings?: number }>) {
  const map = new Map<string, number>();
  items.forEach((i) => map.set(i.category, (map.get(i.category) || 0) + (i.savings || 0)));
  return [...map.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}
