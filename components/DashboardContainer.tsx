import React, { useState } from 'react';
import { DashboardData } from '../types';
import OverviewDashboard from './OverviewDashboard';
import SecurityDashboard from './SecurityDashboard';
import MonitoringDashboard from './MonitoringDashboard';
import RecommendationDashboard from './RecommendationDashboard';
import EventLogDashboard from './EventLogDashboard';
import IAMDashboard from './IAMDashboard';
import CostDashboard from './CostDashboard';
import GovernanceDashboard from './GovernanceDashboard';
import { LayoutGrid, Shield, Activity, Lightbulb, FileClock, Users, Settings, HelpCircle, LogOut, ChevronDown, Search, Calendar, Download, DollarSign, AlertOctagon, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface DashboardContainerProps {
  data: DashboardData;
}

type TabType = 'overview' | 'cost' | 'governance' | 'security' | 'monitoring' | 'recommendations' | 'events' | 'iam';

const DashboardContainer: React.FC<DashboardContainerProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const menuGroups = [
      {
          label: 'General',
          items: [
              { id: 'overview', label: 'Executive Dashboard', icon: LayoutGrid },
          ]
      },
      {
          label: 'Financial Mgmt',
          items: [
              { id: 'cost', label: 'Cost Analysis', icon: DollarSign },
              { id: 'recommendations', label: 'Savings Advisor', icon: Lightbulb },
          ]
      },
      {
          label: 'Governance',
          items: [
              { id: 'governance', label: 'Health Check', icon: AlertOctagon },
              { id: 'security', label: 'Security Posture', icon: Shield },
              { id: 'iam', label: 'Identity (IAM)', icon: Users },
          ]
      },
      {
          label: 'Operations',
          items: [
              { id: 'monitoring', label: 'Asset Utilization', icon: Activity },
              { id: 'events', label: 'Activity Logs', icon: FileClock },
          ]
      }
  ];

  const getTitle = () => {
      for (const group of menuGroups) {
          const item = group.items.find(i => i.id === activeTab);
          if (item) return item.label;
      }
      return 'Dashboard';
  };

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a3'); // Landscape A3 for more space
      const W = pdf.internal.pageSize.getWidth();  // ~420mm
      const H = pdf.internal.pageSize.getHeight(); // ~297mm
      const M = 8; // margin
      const COL = (W - M * 2) / 4; // 4 columns
      let y = 0;

      // ── Color palette ──
      const SLATE_900: [number, number, number] = [15, 23, 42];
      const SLATE_700: [number, number, number] = [51, 65, 85];
      const SLATE_500: [number, number, number] = [100, 116, 139];
      const SLATE_200: [number, number, number] = [226, 232, 240];
      const WHITE: [number, number, number] = [255, 255, 255];
      const BLUE_600: [number, number, number] = [37, 99, 235];
      const GREEN_600: [number, number, number] = [22, 163, 74];
      const RED_600: [number, number, number] = [220, 38, 38];
      const AMBER_600: [number, number, number] = [217, 119, 6];
      const BLUE_50: [number, number, number] = [239, 246, 255];
      const GREEN_50: [number, number, number] = [240, 253, 244];
      const RED_50: [number, number, number] = [254, 242, 242];
      const AMBER_50: [number, number, number] = [255, 251, 235];

      // ── Helper: draw a rounded rect ──
      const roundRect = (x: number, y: number, w: number, h: number, r: number, fill: [number, number, number], border?: [number, number, number]) => {
        pdf.setFillColor(...fill);
        if (border) { pdf.setDrawColor(...border); pdf.setLineWidth(0.3); }
        pdf.roundedRect(x, y, w, h, r, r, border ? 'FD' : 'F');
      };

      // ── Helper: section title ──
      const sectionTitle = (x: number, y: number, icon: string, title: string) => {
        pdf.setFontSize(7);
        pdf.setTextColor(...BLUE_600);
        pdf.text(icon, x, y);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(...SLATE_900);
        pdf.text(title, x + 5, y);
      };

      // ── Helper: KPI box ──
      const kpiBox = (x: number, y: number, w: number, h: number, label: string, value: string, accent: [number, number, number], bgColor: [number, number, number]) => {
        roundRect(x, y, w, h, 2, bgColor);
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...SLATE_500);
        pdf.text(label, x + 3, y + 5);
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...accent);
        pdf.text(value, x + 3, y + 13);
      };

      // ── Helper: severity badge ──
      const severityColor = (s: string): { fg: [number, number, number]; bg: [number, number, number] } => {
        if (s === 'High') return { fg: RED_600, bg: RED_50 };
        if (s === 'Medium') return { fg: AMBER_600, bg: AMBER_50 };
        return { fg: GREEN_600, bg: GREEN_50 };
      };

      // ── Helper: status badge ──
      const statusBadge = (x: number, y: number, status: string) => {
        const colors: Record<string, { fg: [number, number, number]; bg: [number, number, number] }> = {
          'Passed': { fg: GREEN_600, bg: GREEN_50 },
          'Succeeded': { fg: GREEN_600, bg: GREEN_50 },
          'Failed': { fg: RED_600, bg: RED_50 },
          'Warning': { fg: AMBER_600, bg: AMBER_50 },
          'Started': { fg: BLUE_600, bg: BLUE_50 },
        };
        const c = colors[status] || { fg: SLATE_500, bg: SLATE_200 };
        roundRect(x, y - 3, pdf.getTextWidth(status) + 4, 4.5, 1, c.bg);
        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...c.fg);
        pdf.text(status, x + 2, y);
      };

      // ── Helper: mini bar chart ──
      const miniBarChart = (x: number, y: number, w: number, h: number, items: { label: string; value: number }[], color: [number, number, number]) => {
        const maxVal = Math.max(...items.map(i => i.value), 1);
        const barH = Math.min(3.5, (h - 2) / items.length - 1);
        items.forEach((item, i) => {
          const by = y + i * (barH + 1.5);
          pdf.setFontSize(5);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...SLATE_500);
          const labelTxt = item.label.length > 20 ? item.label.substring(0, 20) + '...' : item.label;
          pdf.text(labelTxt, x, by + barH - 0.5);
          const barX = x + 32;
          const barW = (w - 44) * (item.value / maxVal);
          roundRect(barX, by, barW, barH, 1, color);
          pdf.setFontSize(5);
          pdf.setTextColor(...SLATE_700);
          pdf.text(fmtCurrency(item.value), barX + barW + 2, by + barH - 0.5);
        });
      };

      // ══════════════════════════════════════════════════════════════
      // HEADER BAR
      // ══════════════════════════════════════════════════════════════
      roundRect(0, 0, W, 18, 0, SLATE_900);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(...WHITE);
      pdf.text('OverClouded — Cloud Intelligence Report', M, 11);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Subscription: ${data.subscriptionId}`, W / 2 - 20, 11);
      pdf.setFontSize(8);
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      pdf.text(dateStr, W - M - pdf.getTextWidth(dateStr), 11);
      y = 22;

      // ══════════════════════════════════════════════════════════════
      // ROW 1: Cloud Health Score + Cost KPIs + Security KPIs + Governance KPIs
      // ══════════════════════════════════════════════════════════════
      const R1H = 42;
      const cardGap = 4;
      const cardW = (W - M * 2 - cardGap * 3) / 4;

      // ── Cloud Health Score Card ──
      const healthScore = Math.round(((data.security?.score || 0) + (data.governance?.healthScore || 0)) / 2);
      roundRect(M, y, cardW, R1H, 3, WHITE, SLATE_200);
      sectionTitle(M + 4, y + 6, '◉', 'Cloud Health Score');
      // Score circle
      const cx = M + cardW / 2;
      const cy = y + 25;
      pdf.setDrawColor(...SLATE_200);
      pdf.setLineWidth(2);
      pdf.circle(cx, cy, 10);
      const scoreColor = healthScore >= 70 ? GREEN_600 : healthScore >= 40 ? AMBER_600 : RED_600;
      pdf.setDrawColor(...scoreColor);
      pdf.setLineWidth(2.5);
      // Just draw the full circle colored since arcs are complex in jsPDF
      pdf.circle(cx, cy, 10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(...scoreColor);
      pdf.text(String(healthScore), cx - pdf.getTextWidth(String(healthScore)) / 2, cy + 4);
      pdf.setFontSize(5.5);
      pdf.setTextColor(...SLATE_500);
      pdf.setFont('helvetica', 'normal');
      const healthLabel = healthScore >= 70 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Critical';
      pdf.text(healthLabel, cx - pdf.getTextWidth(healthLabel) / 2, cy + 14);

      // ── Cost Summary Card ──
      const c2x = M + cardW + cardGap;
      roundRect(c2x, y, cardW, R1H, 3, WHITE, SLATE_200);
      sectionTitle(c2x + 4, y + 6, '$', 'Cost Summary');
      const kpiW = (cardW - 12) / 2;
      kpiBox(c2x + 4, y + 10, kpiW, 17, 'Month-to-Date', fmtCurrency(data.cost.currentMonthCost), SLATE_900, BLUE_50);
      kpiBox(c2x + 4 + kpiW + 4, y + 10, kpiW, 17, 'Forecast', fmtCurrency(data.cost.forecastedCost), BLUE_600, BLUE_50);
      kpiBox(c2x + 4, y + 29, kpiW, 10, 'Budget', fmtCurrency(data.cost.budget), SLATE_700, SLATE_200);
      kpiBox(c2x + 4 + kpiW + 4, y + 29, kpiW, 10, 'Potential Savings', fmtCurrency(data.cost.potentialSavings), GREEN_600, GREEN_50);

      // ── Security Summary Card ──
      const c3x = M + (cardW + cardGap) * 2;
      roundRect(c3x, y, cardW, R1H, 3, WHITE, SLATE_200);
      sectionTitle(c3x + 4, y + 6, '⛨', 'Security Posture');
      kpiBox(c3x + 4, y + 10, kpiW, 17, 'Security Score', `${data.security.score}%`, data.security.score >= 70 ? GREEN_600 : RED_600, data.security.score >= 70 ? GREEN_50 : RED_50);
      kpiBox(c3x + 4 + kpiW + 4, y + 10, kpiW, 17, 'Active Threats', String(data.security.activeThreats), data.security.activeThreats > 0 ? RED_600 : GREEN_600, data.security.activeThreats > 0 ? RED_50 : GREEN_50);
      kpiBox(c3x + 4, y + 29, kpiW, 10, 'Compliance', `${data.security.complianceScore}%`, BLUE_600, BLUE_50);
      kpiBox(c3x + 4 + kpiW + 4, y + 29, kpiW, 10, 'Critical Vulns', String(data.security.criticalVulnerabilities), data.security.criticalVulnerabilities > 0 ? RED_600 : GREEN_600, data.security.criticalVulnerabilities > 0 ? RED_50 : GREEN_50);

      // ── Governance Summary Card ──
      const c4x = M + (cardW + cardGap) * 3;
      roundRect(c4x, y, cardW, R1H, 3, WHITE, SLATE_200);
      sectionTitle(c4x + 4, y + 6, '◈', 'Governance Health');
      kpiBox(c4x + 4, y + 10, kpiW, 17, 'Health Score', `${data.governance.healthScore}%`, data.governance.healthScore >= 70 ? GREEN_600 : AMBER_600, data.governance.healthScore >= 70 ? GREEN_50 : AMBER_50);
      kpiBox(c4x + 4 + kpiW + 4, y + 10, kpiW, 17, 'Policy Violations', String(data.governance.policyViolations), data.governance.policyViolations > 5 ? RED_600 : GREEN_600, data.governance.policyViolations > 5 ? RED_50 : GREEN_50);
      kpiBox(c4x + 4, y + 29, kpiW, 10, 'Tagging', `${data.governance.taggingCompliance}%`, BLUE_600, BLUE_50);
      kpiBox(c4x + 4 + kpiW + 4, y + 29, kpiW, 10, 'Zombie Assets', String(data.governance.zombieAssets), data.governance.zombieAssets > 0 ? AMBER_600 : GREEN_600, data.governance.zombieAssets > 0 ? AMBER_50 : GREEN_50);

      y += R1H + 4;

      // ══════════════════════════════════════════════════════════════
      // ROW 2: Monitoring KPIs + Cost by Service + Security Alerts + Governance Policies
      // ══════════════════════════════════════════════════════════════
      const R2H = 60;

      // ── Monitoring & Operations Card ──
      roundRect(M, y, cardW, R2H, 3, WHITE, SLATE_200);
      sectionTitle(M + 4, y + 6, '◎', 'Infrastructure & Operations');
      kpiBox(M + 4, y + 10, kpiW, 14, 'Virtual Machines', String(data.monitoring.vmCount), BLUE_600, BLUE_50);
      kpiBox(M + 4 + kpiW + 4, y + 10, kpiW, 14, 'Storage Used', `${data.monitoring.storageUsedTB} TB`, SLATE_900, SLATE_200);
      kpiBox(M + 4, y + 26, kpiW, 14, 'Active Users', String(data.monitoring.activeUsers), BLUE_600, BLUE_50);
      kpiBox(M + 4 + kpiW + 4, y + 26, kpiW, 14, 'Uptime', `${data.monitoring.uptime}%`, data.monitoring.uptime >= 99 ? GREEN_600 : AMBER_600, data.monitoring.uptime >= 99 ? GREEN_50 : AMBER_50);
      // Efficiency Score
      kpiBox(M + 4, y + 42, cardW - 8, 14, 'Efficiency Score (Advisor)', `${data.recommendations.efficiencyScore}%`, BLUE_600, BLUE_50);

      // ── Cost by Service (bar chart) ──
      roundRect(c2x, y, cardW, R2H, 3, WHITE, SLATE_200);
      sectionTitle(c2x + 4, y + 6, '▤', 'Cost by Service');
      const topServices = (data.cost.costByService || []).slice(0, 8);
      if (topServices.length > 0) {
        miniBarChart(c2x + 4, y + 12, cardW - 8, R2H - 16, topServices, BLUE_600);
      }

      // ── Security Alerts Table ──
      roundRect(c3x, y, cardW, R2H, 3, WHITE, SLATE_200);
      sectionTitle(c3x + 4, y + 6, '▲', 'Security Alerts');
      const alerts = (data.security.alerts || []).slice(0, 8);
      let ay = y + 12;
      // Table header
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...SLATE_500);
      pdf.text('SEVERITY', c3x + 4, ay);
      pdf.text('DESCRIPTION', c3x + 24, ay);
      ay += 1;
      pdf.setDrawColor(...SLATE_200);
      pdf.setLineWidth(0.2);
      pdf.line(c3x + 4, ay, c3x + cardW - 4, ay);
      ay += 3;
      pdf.setFont('helvetica', 'normal');
      alerts.forEach((alert) => {
        if (ay > y + R2H - 4) return;
        const sc = severityColor(alert.severity);
        roundRect(c3x + 4, ay - 2.5, 16, 4, 1, sc.bg);
        pdf.setFontSize(5);
        pdf.setTextColor(...sc.fg);
        pdf.setFont('helvetica', 'bold');
        pdf.text(alert.severity, c3x + 6, ay);
        pdf.setTextColor(...SLATE_700);
        pdf.setFont('helvetica', 'normal');
        const desc = alert.description.length > 50 ? alert.description.substring(0, 50) + '...' : alert.description;
        pdf.text(desc, c3x + 24, ay);
        ay += 5.5;
      });
      if (alerts.length === 0) {
        pdf.setFontSize(6);
        pdf.setTextColor(...GREEN_600);
        pdf.text('No active alerts — looking good!', c3x + 10, y + 30);
      }

      // ── Governance Policies Table ──
      roundRect(c4x, y, cardW, R2H, 3, WHITE, SLATE_200);
      sectionTitle(c4x + 4, y + 6, '✓', 'Policy Compliance');
      const policies = (data.governance.policies || []).slice(0, 8);
      let py = y + 12;
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...SLATE_500);
      pdf.text('STATUS', c4x + 4, py);
      pdf.text('POLICY', c4x + 22, py);
      pdf.text('AFFECTED', c4x + cardW - 20, py);
      py += 1;
      pdf.line(c4x + 4, py, c4x + cardW - 4, py);
      py += 3;
      pdf.setFont('helvetica', 'normal');
      policies.forEach((pol) => {
        if (py > y + R2H - 4) return;
        statusBadge(c4x + 4, py, pol.status);
        pdf.setFontSize(5);
        pdf.setTextColor(...SLATE_700);
        const polName = pol.name.length > 35 ? pol.name.substring(0, 35) + '...' : pol.name;
        pdf.text(polName, c4x + 22, py);
        pdf.text(String(pol.affectedResources), c4x + cardW - 16, py);
        py += 5.5;
      });

      y += R2H + 4;

      // ══════════════════════════════════════════════════════════════
      // ROW 3: Recommendations + Activity Logs + IAM Role Assignments
      // ══════════════════════════════════════════════════════════════
      const R3H = H - y - M - 16; // Fill remaining height minus footer
      const col3W = (W - M * 2 - cardGap * 2) / 3;

      // ── Recommendations ──
      roundRect(M, y, col3W, R3H, 3, WHITE, SLATE_200);
      sectionTitle(M + 4, y + 6, '★', `Recommendations (Save ${fmtCurrency(data.recommendations.monthlySavings)}/mo)`);
      const recs = (data.recommendations.items || []).slice(0, 12);
      let ry = y + 12;
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...SLATE_500);
      pdf.text('IMPACT', M + 4, ry);
      pdf.text('CATEGORY', M + 20, ry);
      pdf.text('DESCRIPTION', M + 40, ry);
      pdf.text('SAVINGS', M + col3W - 22, ry);
      ry += 1;
      pdf.line(M + 4, ry, M + col3W - 4, ry);
      ry += 3;
      pdf.setFont('helvetica', 'normal');
      recs.forEach((rec) => {
        if (ry > y + R3H - 4) return;
        const ic = severityColor(rec.impact);
        roundRect(M + 4, ry - 2.5, 13, 4, 1, ic.bg);
        pdf.setFontSize(5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...ic.fg);
        pdf.text(rec.impact, M + 6, ry);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...BLUE_600);
        pdf.text(rec.category, M + 20, ry);
        pdf.setTextColor(...SLATE_700);
        const desc = rec.description.length > 55 ? rec.description.substring(0, 55) + '...' : rec.description;
        pdf.text(desc, M + 40, ry);
        if (rec.savings) {
          pdf.setTextColor(...GREEN_600);
          pdf.text(fmtCurrency(rec.savings), M + col3W - 22, ry);
        }
        ry += 5;
      });

      // ── Activity Logs ──
      const alx = M + col3W + cardGap;
      roundRect(alx, y, col3W, R3H, 3, WHITE, SLATE_200);
      sectionTitle(alx + 4, y + 6, '◷', 'Recent Activity Logs');
      const events = (data.events || []).slice(0, 14);
      let ey = y + 12;
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...SLATE_500);
      pdf.text('STATUS', alx + 4, ey);
      pdf.text('OPERATION', alx + 22, ey);
      pdf.text('CALLER', alx + col3W - 35, ey);
      pdf.text('TIME', alx + col3W - 15, ey);
      ey += 1;
      pdf.line(alx + 4, ey, alx + col3W - 4, ey);
      ey += 3;
      pdf.setFont('helvetica', 'normal');
      events.forEach((evt) => {
        if (ey > y + R3H - 4) return;
        statusBadge(alx + 4, ey, evt.status);
        pdf.setFontSize(5);
        pdf.setTextColor(...SLATE_700);
        const op = evt.operationName.length > 35 ? evt.operationName.substring(0, 35) + '...' : evt.operationName;
        pdf.text(op, alx + 22, ey);
        pdf.setTextColor(...SLATE_500);
        const caller = evt.caller.length > 18 ? evt.caller.substring(0, 18) + '...' : evt.caller;
        pdf.text(caller, alx + col3W - 35, ey);
        const time = new Date(evt.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        pdf.text(time, alx + col3W - 15, ey);
        ey += 5;
      });

      // ── IAM Role Assignments ──
      const iamx = alx + col3W + cardGap;
      roundRect(iamx, y, col3W, R3H, 3, WHITE, SLATE_200);
      sectionTitle(iamx + 4, y + 6, '⊕', 'IAM Role Assignments');
      const iamEntries = (data.iamExtended?.roleAssignments || data.iam || []).slice(0, 14);
      let iy = y + 12;
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...SLATE_500);
      pdf.text('PRINCIPAL', iamx + 4, iy);
      pdf.text('TYPE', iamx + 40, iy);
      pdf.text('ROLE', iamx + 60, iy);
      iy += 1;
      pdf.line(iamx + 4, iy, iamx + col3W - 4, iy);
      iy += 3;
      pdf.setFont('helvetica', 'normal');
      iamEntries.forEach((iam) => {
        if (iy > y + R3H - 4) return;
        pdf.setFontSize(5);
        pdf.setTextColor(...SLATE_900);
        pdf.setFont('helvetica', 'bold');
        const name = iam.principalName.length > 25 ? iam.principalName.substring(0, 25) + '...' : iam.principalName;
        pdf.text(name, iamx + 4, iy);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...BLUE_600);
        pdf.text(iam.principalType, iamx + 40, iy);
        pdf.setTextColor(...SLATE_700);
        const role = iam.roleName.length > 28 ? iam.roleName.substring(0, 28) + '...' : iam.roleName;
        pdf.text(role, iamx + 60, iy);
        iy += 5;
      });

      // ══════════════════════════════════════════════════════════════
      // FOOTER BAR
      // ══════════════════════════════════════════════════════════════
      const footerY = H - 10;
      roundRect(0, footerY, W, 10, 0, SLATE_900);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor(...SLATE_200);
      pdf.text('Generated by OverClouded — Cloud Intelligence Platform', M, footerY + 6);
      pdf.text(`Report Date: ${dateStr}  |  Data Source: ${data.isRealData ? 'Live Azure API' : 'Simulated (Gemini AI)'}  |  Subscription: ${data.subscriptionId}`, W / 2 - 50, footerY + 6);
      pdf.text('Confidential', W - M - pdf.getTextWidth('Confidential'), footerY + 6);

      pdf.save(`OverClouded_Report_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('PDF Generation failed', error);
      alert('Failed to generate PDF report.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col flex-shrink-0 z-20">
        
        {/* Profile / Header Area */}
        <div className="p-6 border-b border-slate-50">
           <div className="flex items-center gap-3 mb-6">
                <img src="/logo.svg" alt="Overclouded" className="w-9 h-9" />
                <span className="font-bold text-lg tracking-tight">Overclouded</span>
           </div>
           
           <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                    <Users className="w-6 h-6 text-slate-400" />
               </div>
               <div className="flex-1 min-w-0">
                   <p className="text-sm font-bold text-slate-900 truncate">Admin User</p>
                   <p className="text-xs text-slate-500 truncate">{data.subscriptionId}</p>
               </div>
           </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
            {menuGroups.map((group, gIdx) => (
                <div key={gIdx}>
                    <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{group.label}</p>
                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const isActive = activeTab === item.id;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as TabType)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                        isActive 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
        
        <div className="p-4 border-t border-slate-50 bg-slate-50/50">
             <button className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-500 text-xs font-bold uppercase tracking-wider transition-colors" onClick={() => window.location.reload()}>
                <LogOut className="w-4 h-4" /> Sign Out
             </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Top Header */}
          <header className="bg-white/80 backdrop-blur-md px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 border-b border-slate-100 z-10">
             <div>
                 <h1 className="text-xl font-bold text-slate-900">{getTitle()}</h1>
             </div>

             <div className="flex items-center gap-3">
                 <div className="hidden md:flex items-center bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-sm">
                    <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="text-slate-700 font-medium">This Month</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-4" />
                 </div>
                 
                 <button 
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPdf}
                    className="flex items-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg shadow-slate-900/10 text-sm font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    {isGeneratingPdf ? 'Generating...' : 'PDF Report'}
                 </button>
             </div>
          </header>

          {/* Scrollable Content Area */}
          <div id="dashboard-content" className="flex-1 overflow-y-auto px-8 pb-8 pt-6 custom-scrollbar bg-slate-50">
             {activeTab === 'overview' && <OverviewDashboard data={data} />}
             {activeTab === 'cost' && <CostDashboard data={data.cost} />}
             {activeTab === 'governance' && <GovernanceDashboard data={data.governance} />}
             {activeTab === 'security' && <SecurityDashboard data={data.security} />}
             {activeTab === 'monitoring' && <MonitoringDashboard data={data.monitoring} />}
             {activeTab === 'recommendations' && <RecommendationDashboard data={data.recommendations} />}
             {activeTab === 'events' && <EventLogDashboard data={data.events} devops={data.devops} />}
             {activeTab === 'iam' && <IAMDashboard data={data.iamExtended} />}
          </div>

      </main>
    </div>
  );
};

export default DashboardContainer;