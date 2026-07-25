import { DashboardData } from '../../types';
import { money, pct } from './primitives';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Finding {
  severity: Severity;
  area: string;
  title: string;
  detail: string;
  /** Estimated monthly dollar impact, where one can be attributed. */
  impact?: number;
}

const RANK: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/**
 * Derive the report's findings from the collected telemetry.
 *
 * This is what turns the export from a pile of charts into something an
 * account team can hand to a client: every item names the condition, the
 * evidence behind it and — where the data supports one — a dollar impact.
 */
export const deriveFindings = (data: DashboardData): Finding[] => {
  const f: Finding[] = [];
  const cost = data.cost;
  const sec = data.security;
  const gov = data.governance;
  const mon = data.monitoring;
  const iam = data.iamExtended;

  // ── Budget ──
  if (cost?.forecastedCost && cost?.budget) {
    const over = cost.forecastedCost - cost.budget;
    if (over > 0) {
      f.push({
        severity: over / cost.budget > 0.15 ? 'Critical' : 'High',
        area: 'Cost',
        title: 'Forecast exceeds committed budget',
        detail: `Month-end forecast of ${money(cost.forecastedCost)} is ${money(over)} above the ${money(cost.budget)} budget (${pct((over / cost.budget) * 100, 1)} over).`,
        impact: over,
      });
    } else {
      f.push({
        severity: 'Low',
        area: 'Cost',
        title: 'Spend tracking within budget',
        detail: `Forecast of ${money(cost.forecastedCost)} lands ${money(-over)} under the ${money(cost.budget)} budget.`,
      });
    }
  }

  if (cost?.potentialSavings > 0) {
    const share = cost.currentMonthCost ? (cost.potentialSavings / cost.currentMonthCost) * 100 : 0;
    f.push({
      severity: share > 20 ? 'High' : 'Medium',
      area: 'Cost',
      title: 'Unrealised savings identified',
      detail: `${money(cost.potentialSavings)} per month (${pct(share, 1)} of current spend) is recoverable through rightsizing and reservation coverage.`,
      impact: cost.potentialSavings,
    });
  }

  if (typeof cost?.riCoverage === 'number' && cost.riCoverage < 60) {
    f.push({
      severity: cost.riCoverage < 30 ? 'High' : 'Medium',
      area: 'Cost',
      title: 'Low reserved instance coverage',
      detail: `Only ${pct(cost.riCoverage)} of eligible compute is covered by reservations, leaving on-demand premium on the table.`,
    });
  }

  if (cost?.monthOverMonthChange > 10) {
    f.push({
      severity: cost.monthOverMonthChange > 25 ? 'High' : 'Medium',
      area: 'Cost',
      title: 'Month-over-month spend increase',
      detail: `Spend rose ${pct(cost.monthOverMonthChange, 1)} versus the prior month, outpacing typical organic growth.`,
    });
  }

  (cost?.costAnomalies || []).slice(0, 2).forEach((a) => {
    const delta = a.actualCost - a.expectedCost;
    if (delta <= 0) return;
    f.push({
      severity: 'High',
      area: 'Cost',
      title: `Spend anomaly on ${a.service}`,
      detail: `On ${a.date}, ${a.service} billed ${money(a.actualCost)} against an expected ${money(a.expectedCost)} — a ${money(delta)} variance.`,
      impact: delta,
    });
  });

  // ── Security ──
  if (sec?.criticalVulnerabilities > 0) {
    f.push({
      severity: 'Critical',
      area: 'Security',
      title: 'Critical vulnerabilities open',
      detail: `${sec.criticalVulnerabilities} critical findings require remediation. Secure score currently sits at ${pct(sec.score)}.`,
    });
  }
  if (sec?.activeThreats > 0) {
    f.push({
      severity: 'Critical',
      area: 'Security',
      title: 'Active threats detected',
      detail: `${sec.activeThreats} active threat${sec.activeThreats === 1 ? '' : 's'} flagged by Defender for Cloud, including ${(sec.alerts || [])[0]?.description ?? 'unclassified activity'}.`,
    });
  }
  if (sec?.networkSecurity?.openNsgRules > 0) {
    f.push({
      severity: sec.networkSecurity.openNsgRules > 10 ? 'High' : 'Medium',
      area: 'Security',
      title: 'Permissive network security rules',
      detail: `${sec.networkSecurity.openNsgRules} NSG rules allow broad inbound access across ${sec.networkSecurity.publicIps} public IPs, with ${sec.networkSecurity.unprotectedEndpoints} unprotected endpoints.`,
    });
  }
  if (sec?.encryptionStatus?.unencryptedResources > 0) {
    f.push({
      severity: 'High',
      area: 'Security',
      title: 'Unencrypted resources present',
      detail: `${sec.encryptionStatus.unencryptedResources} of ${sec.encryptionStatus.encryptedResources + sec.encryptionStatus.unencryptedResources} resources are not encrypted at rest.`,
    });
  }
  const kv = sec?.keyVaultHealth;
  if (kv && (kv.expiringSecrets > 0 || kv.expiringCertificates > 0)) {
    f.push({
      severity: 'High',
      area: 'Security',
      title: 'Key Vault material approaching expiry',
      detail: `${kv.expiringSecrets} secret(s) and ${kv.expiringCertificates} certificate(s) expire soon — an outage risk if rotation is not scheduled.`,
    });
  }
  const worstFramework = [...(sec?.regulatoryCompliance || [])].sort(
    (a, b) => a.passedControls / (a.totalControls || 1) - b.passedControls / (b.totalControls || 1)
  )[0];
  if (worstFramework) {
    const share = (worstFramework.passedControls / (worstFramework.totalControls || 1)) * 100;
    if (share < 90) {
      f.push({
        severity: share < 70 ? 'High' : 'Medium',
        area: 'Compliance',
        title: `${worstFramework.framework} coverage below target`,
        detail: `${worstFramework.failedControls} of ${worstFramework.totalControls} controls are failing (${pct(share)} passing).`,
      });
    }
  }

  // ── Governance ──
  if (gov?.policyViolations > 0) {
    f.push({
      severity: gov.policyViolations > 10 ? 'High' : 'Medium',
      area: 'Governance',
      title: 'Azure Policy violations outstanding',
      detail: `${gov.policyViolations} policy violations recorded against a governance health score of ${pct(gov.healthScore)}.`,
    });
  }
  const orphanCost = (gov?.orphanedResources || []).reduce((s, r) => s + (r.estimatedMonthlyCost || 0), 0);
  if (orphanCost > 0) {
    f.push({
      severity: 'Medium',
      area: 'Governance',
      title: 'Orphaned resources still billing',
      detail: `${(gov.orphanedResources || []).length} unattached resources cost ${money(orphanCost)} per month and can be deleted without service impact.`,
      impact: orphanCost,
    });
  }
  if (gov?.taggingCompliance < 90) {
    f.push({
      severity: gov.taggingCompliance < 70 ? 'Medium' : 'Low',
      area: 'Governance',
      title: 'Incomplete tagging coverage',
      detail: `Tagging compliance is ${pct(gov.taggingCompliance)}, which limits chargeback accuracy and ownership attribution.`,
    });
  }
  const nearQuota = (gov?.subscriptionQuotas || []).filter((q) => q.limit > 0 && q.currentUsage / q.limit >= 0.8);
  if (nearQuota.length > 0) {
    f.push({
      severity: 'High',
      area: 'Governance',
      title: 'Subscription quotas near limit',
      detail: `${nearQuota.length} quota(s) exceed 80% utilisation, including ${nearQuota[0].name} at ${pct((nearQuota[0].currentUsage / nearQuota[0].limit) * 100)}.`,
    });
  }

  // ── Operations ──
  const breaches = (data.executive?.slaTracking || []).filter((s) => s.actualUptime < s.contractualSla);
  if (breaches.length > 0) {
    f.push({
      severity: 'Critical',
      area: 'Reliability',
      title: 'Contractual SLA breached',
      detail: `${breaches.length} service(s) fell below contractual SLA, including ${breaches[0].service} at ${pct(breaches[0].actualUptime, 2)} against ${pct(breaches[0].contractualSla, 2)}.`,
    });
  }
  if (mon?.backupCoverage?.unprotectedResources > 0) {
    f.push({
      severity: 'High',
      area: 'Reliability',
      title: 'Resources without backup protection',
      detail: `${mon.backupCoverage.unprotectedResources} resources have no backup policy applied, creating unrecoverable data-loss exposure.`,
    });
  }
  if (mon?.resourceHealth?.unavailable > 0) {
    f.push({
      severity: 'High',
      area: 'Reliability',
      title: 'Unavailable resources detected',
      detail: `${mon.resourceHealth.unavailable} resource(s) report an unavailable health state and ${mon.resourceHealth.degraded} are degraded.`,
    });
  }

  // ── Identity ──
  if (iam?.staleAccounts > 0) {
    f.push({
      severity: iam.staleAccounts > 10 ? 'High' : 'Medium',
      area: 'Identity',
      title: 'Stale identities retain access',
      detail: `${iam.staleAccounts} account(s) have not signed in for 90+ days yet retain role assignments.`,
    });
  }
  if (iam?.privilegedRoleSummary?.owners > 3) {
    f.push({
      severity: 'High',
      area: 'Identity',
      title: 'Excessive subscription owners',
      detail: `${iam.privilegedRoleSummary.owners} identities hold Owner. Least-privilege guidance is to keep this at or below three.`,
    });
  }
  if (iam?.guestUsers > 0) {
    f.push({
      severity: 'Medium',
      area: 'Identity',
      title: 'External guest access in place',
      detail: `${iam.guestUsers} guest user(s) hold assignments and should be reviewed against current engagements.`,
    });
  }
  const expiringSps = (iam?.servicePrincipals || []).filter((sp) => {
    const d = new Date(sp.credentialExpiry);
    return !isNaN(d.getTime()) && d.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 90;
  });
  if (expiringSps.length > 0) {
    f.push({
      severity: 'Medium',
      area: 'Identity',
      title: 'Service principal credentials expiring',
      detail: `${expiringSps.length} service principal credential(s) expire within 90 days, including ${expiringSps[0].name}.`,
    });
  }

  return f.sort((a, b) => RANK[a.severity] - RANK[b.severity] || (b.impact ?? 0) - (a.impact ?? 0));
};
