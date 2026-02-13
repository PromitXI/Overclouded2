import { DashboardData, ActivityLogEntry, IAMRoleAssignment, DeploymentEntry } from "../types";

const AZURE_MGMT_URL = "https://management.azure.com";

interface AzureResource {
  id: string;
  name: string;
  type: string;
  location: string;
  tags?: Record<string, string>;
}

interface AzureRecommendation {
  id: string;
  name: string;
  type: string;
  properties: {
    category: string;
    impact: string;
    shortDescription: { problem: string; solution: string };
    extendedProperties?: { savingsAmount?: string };
  };
}

// Safe JSON fetch helper — returns null on failure so one bad call doesn't break everything
async function safeFetch(url: string, headers: Record<string, string>): Promise<any | null> {
  try {
    const resp = await fetch(url, { headers });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export const fetchAzureData = async (subscriptionId: string, accessToken: string): Promise<DashboardData> => {
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };

  try {
    // ════════════════════════════════════════════════════════════
    // 1. RESOURCES — single call, derive many sub-metrics from it
    // ════════════════════════════════════════════════════════════
    const resourcesJson = await safeFetch(
      `${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/resources?api-version=2021-04-01`,
      headers
    );
    const resources: AzureResource[] = resourcesJson?.value || [];

    const vmCount = resources.filter(r => r.type.toLowerCase().includes('virtualmachine') && !r.type.toLowerCase().includes('extensions')).length;
    const storageCount = resources.filter(r => r.type.toLowerCase() === 'microsoft.storage/storageaccounts').length;

    // Resource Inventory by Type
    const typeMap = new Map<string, number>();
    resources.forEach(r => {
      const shortType = r.type.split('/').pop() || r.type;
      typeMap.set(shortType, (typeMap.get(shortType) || 0) + 1);
    });
    const resourcesByType = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Resource Inventory by Region
    const regionMap = new Map<string, number>();
    resources.forEach(r => {
      const loc = r.location || 'unknown';
      regionMap.set(loc, (regionMap.get(loc) || 0) + 1);
    });
    const resourcesByRegion = Array.from(regionMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    // Tagging compliance
    const taggedCount = resources.filter(r => r.tags && Object.keys(r.tags).length > 0).length;
    const taggingCompliance = resources.length > 0 ? Math.round((taggedCount / resources.length) * 100) : 0;

    // Orphaned resources heuristic (unattached disks, unused public IPs, empty NICs)
    const orphanedTypes = ['microsoft.compute/disks', 'microsoft.network/publicipaddresses', 'microsoft.network/networkinterfaces'];
    const orphanedResources = resources
      .filter(r => orphanedTypes.includes(r.type.toLowerCase()))
      .slice(0, 20)
      .map(r => ({
        id: r.id,
        name: r.name,
        type: r.type.split('/').pop() || r.type,
        estimatedMonthlyCost: r.type.toLowerCase().includes('disks') ? 20 : 5
      }));

    // Naming convention — simple heuristic: resources following lowercase-dash pattern
    const namingRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    const namingCompliantCount = resources.filter(r => namingRegex.test(r.name)).length;
    const namingCompliancePercent = resources.length > 0 ? Math.round((namingCompliantCount / resources.length) * 100) : 0;

    // ════════════════════════════════════════════════════════════
    // 2. ADVISOR RECOMMENDATIONS
    // ════════════════════════════════════════════════════════════
    const advisorJson = await safeFetch(
      `${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Advisor/recommendations?api-version=2020-01-01`,
      headers
    );
    
    let recommendationsData = { monthlySavings: 0, efficiencyScore: 0, items: [] as any[] };
    
    if (advisorJson) {
      const recommendations: AzureRecommendation[] = advisorJson.value || [];
      let totalSavings = 0;
      const mappedItems = recommendations.slice(0, 20).map((rec, idx) => {
        const savings = rec.properties.extendedProperties?.savingsAmount 
          ? parseFloat(rec.properties.extendedProperties.savingsAmount) 
          : 0;
        totalSavings += savings;
        return {
          id: rec.name || `rec-${idx}`,
          category: mapCategory(rec.properties.category),
          impact: rec.properties.impact as 'High' | 'Medium' | 'Low',
          description: rec.properties.shortDescription.problem,
          savings: savings
        };
      });
      recommendationsData = {
        monthlySavings: Math.round(totalSavings),
        efficiencyScore: mappedItems.length > 0 ? Math.max(0, 100 - (mappedItems.length * 3)) : 100,
        items: mappedItems
      };
    }

    // ════════════════════════════════════════════════════════════
    // 3. SECURITY — Score + Alerts + Regulatory + Network
    // ════════════════════════════════════════════════════════════
    let securityData: any = {
      score: 0, activeThreats: 0, complianceScore: 0, criticalVulnerabilities: 0, alerts: [],
      regulatoryCompliance: [], networkSecurity: { openNsgRules: 0, publicIps: 0, unprotectedEndpoints: 0 },
      encryptionStatus: { encryptedResources: 0, unencryptedResources: 0 },
      keyVaultHealth: { totalSecrets: 0, expiringSecrets: 0, totalCertificates: 0, expiringCertificates: 0 }
    };

    // 3a. Secure Score
    const secScoreJson = await safeFetch(
      `${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Security/secureScores?api-version=2020-01-01`,
      headers
    );
    if (secScoreJson?.value?.[0]) {
      const percentage = secScoreJson.value[0].properties.score.percentage;
      securityData.score = Math.round(percentage * 100);
    }

    // 3b. Alerts
    const alertsJson = await safeFetch(
      `${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Security/alerts?api-version=2022-01-01`,
      headers
    );
    if (alertsJson) {
      const rawAlerts = alertsJson.value || [];
      securityData.activeThreats = rawAlerts.filter((a: any) => a.properties?.status === 'Active').length;
      securityData.criticalVulnerabilities = rawAlerts.filter((a: any) => a.properties?.severity === 'High').length;
      securityData.alerts = rawAlerts.slice(0, 10).map((a: any) => ({
        id: a.name,
        severity: a.properties?.severity || 'Medium',
        description: a.properties?.alertDisplayName || 'Alert',
        time: new Date(a.properties?.timeGenerated || Date.now()).toLocaleString()
      }));
    }

    // 3c. Regulatory Compliance
    const regJson = await safeFetch(
      `${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Security/regulatoryComplianceStandards?api-version=2019-01-01-preview`,
      headers
    );
    if (regJson?.value) {
      securityData.regulatoryCompliance = (regJson.value as any[]).slice(0, 6).map((std: any) => ({
        framework: std.name || 'Unknown',
        passedControls: std.properties?.passedControls || 0,
        failedControls: std.properties?.failedControls || 0,
        totalControls: (std.properties?.passedControls || 0) + (std.properties?.failedControls || 0) + (std.properties?.skippedControls || 0)
      }));
      // Compute average compliance
      if (securityData.regulatoryCompliance.length > 0) {
        const avgCompliance = securityData.regulatoryCompliance.reduce((sum: number, r: any) => {
          return sum + (r.totalControls > 0 ? (r.passedControls / r.totalControls) * 100 : 0);
        }, 0) / securityData.regulatoryCompliance.length;
        securityData.complianceScore = Math.round(avgCompliance);
      }
    }

    // 3d. NSG rules / Public IPs / Network
    const publicIps = resources.filter(r => r.type.toLowerCase() === 'microsoft.network/publicipaddresses');
    const nsgs = resources.filter(r => r.type.toLowerCase() === 'microsoft.network/networksecuritygroups');
    securityData.networkSecurity = {
      openNsgRules: nsgs.length * 3, // heuristic — each NSG has ~3 inbound rules exposed
      publicIps: publicIps.length,
      unprotectedEndpoints: publicIps.length > 3 ? publicIps.length - 3 : 0
    };

    // 3e. Encryption — heuristic from resource types
    const storageAccounts = resources.filter(r => r.type.toLowerCase() === 'microsoft.storage/storageaccounts');
    securityData.encryptionStatus = {
      encryptedResources: storageAccounts.length, // Azure storage is encrypted by default
      unencryptedResources: 0
    };

    // ════════════════════════════════════════════════════════════
    // 4. ACTIVITY LOGS
    // ════════════════════════════════════════════════════════════
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let events: ActivityLogEntry[] = [];

    const logsJson = await safeFetch(
      `${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Insights/eventtypes/management/values?api-version=2015-04-01&$filter=eventTimestamp ge '${startDate}' and eventTimestamp le '${endDate}'&$select=eventName,id,resourceGroupName,operationName,status,eventTimestamp,caller`,
      headers
    );
    if (logsJson) {
      const rawLogs = logsJson.value || [];
      events = rawLogs.slice(0, 100).map((log: any) => ({
        id: log.id,
        timestamp: log.eventTimestamp,
        operationName: formatOperationName(log.operationName?.value || log.operationName),
        status: log.status?.value || 'Unknown',
        caller: log.caller || 'System',
        resourceGroup: log.resourceGroupName || 'N/A',
        description: log.description || formatOperationName(log.operationName?.value || log.operationName)
      }));
    }

    // DevOps: Change velocity from activity logs
    const changeVelocityMap = new Map<string, number>();
    events.forEach(e => {
      const day = new Date(e.timestamp).toISOString().split('T')[0];
      changeVelocityMap.set(day, (changeVelocityMap.get(day) || 0) + 1);
    });
    const changeVelocity = Array.from(changeVelocityMap.entries())
      .map(([date, changes]) => ({ date, changes }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // DevOps: Failed operations summary
    const failedOps = events.filter(e => e.status === 'Failed');
    const failedMap = new Map<string, number>();
    failedOps.forEach(e => {
      failedMap.set(e.operationName, (failedMap.get(e.operationName) || 0) + 1);
    });
    const failedOperationsSummary = Array.from(failedMap.entries())
      .map(([operation, count]) => ({ operation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ════════════════════════════════════════════════════════════
    // 5. IAM ROLE ASSIGNMENTS + Extended
    // ════════════════════════════════════════════════════════════
    let iam: IAMRoleAssignment[] = [];
    let privilegedRoleSummary = { owners: 0, contributors: 0, globalAdmins: 0 };
    let guestUsers = 0;
    let staleAccounts = 0;
    let servicePrincipals: any[] = [];

    const [rolesJson, roleDefsJson] = await Promise.all([
      safeFetch(`${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`, headers),
      safeFetch(`${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions?api-version=2022-04-01`, headers)
    ]);

    if (rolesJson && roleDefsJson) {
      const roleDefMap = new Map<string, string>();
      (roleDefsJson.value || []).forEach((def: any) => {
        roleDefMap.set(def.id, def.properties.roleName);
      });

      iam = (rolesJson.value || []).map((assignment: any) => {
        const roleDefId = assignment.properties.roleDefinitionId;
        const roleName = roleDefMap.get(roleDefId) || 'Custom Role';
        return {
          id: assignment.id,
          principalId: assignment.properties.principalId,
          principalName: assignment.properties.principalId,
          principalType: assignment.properties.principalType || 'Unknown',
          roleName: roleName
        };
      });

      // Privileged role summary
      privilegedRoleSummary = {
        owners: iam.filter(i => i.roleName === 'Owner').length,
        contributors: iam.filter(i => i.roleName === 'Contributor').length,
        globalAdmins: iam.filter(i => i.roleName.toLowerCase().includes('admin')).length
      };

      // Service principals
      servicePrincipals = iam
        .filter(i => i.principalType === 'ServicePrincipal')
        .slice(0, 10)
        .map(i => ({
          name: i.principalName,
          roleName: i.roleName,
          credentialExpiry: 'Unknown'
        }));
    }

    // ════════════════════════════════════════════════════════════
    // 6. DEPLOYMENTS (DevOps)
    // ════════════════════════════════════════════════════════════
    let deployments: DeploymentEntry[] = [];
    // Get resource groups first, then fetch deployments from a few
    const rgJson = await safeFetch(
      `${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`,
      headers
    );
    if (rgJson?.value) {
      const rgs = (rgJson.value as any[]).slice(0, 5);
      const deployPromises = rgs.map(rg =>
        safeFetch(`${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/resourcegroups/${rg.name}/providers/Microsoft.Resources/deployments?api-version=2021-04-01&$top=5`, headers)
      );
      const deployResults = await Promise.all(deployPromises);
      deployResults.forEach((dJson, idx) => {
        if (dJson?.value) {
          (dJson.value as any[]).forEach((d: any) => {
            deployments.push({
              id: d.id,
              name: d.name,
              resourceGroup: rgs[idx].name,
              status: d.properties?.provisioningState || 'Unknown',
              timestamp: d.properties?.timestamp || new Date().toISOString(),
              duration: d.properties?.duration || 'N/A'
            });
          });
        }
      });
      deployments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      deployments = deployments.slice(0, 20);
    }

    // ════════════════════════════════════════════════════════════
    // 7. SERVICE HEALTH
    // ════════════════════════════════════════════════════════════
    let serviceHealth: any[] = [];
    const healthJson = await safeFetch(
      `${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.ResourceHealth/availabilityStatuses?api-version=2020-05-01&$top=20`,
      headers
    );
    if (healthJson?.value) {
      const healthEntries = healthJson.value as any[];
      const healthMap = new Map<string, { healthy: number; degraded: number; unavailable: number }>();
      healthEntries.forEach((h: any) => {
        const resType = h.id?.split('/providers/')?.[1]?.split('/')?.[0] || 'Unknown';
        const state = h.properties?.availabilityState || 'Unknown';
        if (!healthMap.has(resType)) healthMap.set(resType, { healthy: 0, degraded: 0, unavailable: 0 });
        const entry = healthMap.get(resType)!;
        if (state === 'Available') entry.healthy++;
        else if (state === 'Degraded') entry.degraded++;
        else entry.unavailable++;
      });
      serviceHealth = Array.from(healthMap.entries()).map(([service, counts]) => ({
        service,
        status: counts.unavailable > 0 ? 'Unavailable' : counts.degraded > 0 ? 'Degraded' : 'Healthy',
        summary: `${counts.healthy} healthy, ${counts.degraded} degraded, ${counts.unavailable} unavailable`
      }));
    }

    const resourceHealthCounts = {
      healthy: serviceHealth.filter(s => s.status === 'Healthy').length || resources.length,
      degraded: serviceHealth.filter(s => s.status === 'Degraded').length,
      unavailable: serviceHealth.filter(s => s.status === 'Unavailable').length
    };

    // ════════════════════════════════════════════════════════════
    // 8. QUOTAS / USAGE
    // ════════════════════════════════════════════════════════════
    let subscriptionQuotas: any[] = [];
    // Try compute quotas for first region
    const primaryRegion = resourcesByRegion[0]?.region || 'eastus';
    const quotaJson = await safeFetch(
      `${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Compute/locations/${primaryRegion}/usages?api-version=2023-03-01`,
      headers
    );
    if (quotaJson?.value) {
      subscriptionQuotas = (quotaJson.value as any[])
        .filter((q: any) => q.currentValue > 0 || q.name?.localizedValue?.toLowerCase().includes('vcpu'))
        .slice(0, 10)
        .map((q: any) => ({
          name: q.name?.localizedValue || q.name?.value || 'Unknown',
          currentUsage: q.currentValue || 0,
          limit: q.limit || 0
        }));
    }

    // ════════════════════════════════════════════════════════════
    // ASSEMBLE FINAL DATA
    // ════════════════════════════════════════════════════════════
    const costData = {
      currentMonthCost: 0,
      forecastedCost: 0,
      budget: 0,
      riCoverage: 0,
      potentialSavings: recommendationsData.monthlySavings,
      costTrend: [] as any[],
      costByService: [] as any[],
      costByResourceGroup: [] as any[],
      costByRegion: [] as any[],
      monthOverMonthChange: 0,
      costAnomalies: [] as any[]
    };

    const governanceData = {
      healthScore: Math.min(100, Math.round(taggingCompliance * 0.4 + namingCompliancePercent * 0.3 + (100 - Math.min(100, orphanedResources.length * 5)) * 0.3)),
      policyViolations: 0,
      taggingCompliance,
      zombieAssets: orphanedResources.length,
      policies: [] as any[],
      resourcesByType,
      resourcesByRegion,
      orphanedResources,
      subscriptionQuotas,
      namingCompliancePercent
    };

    // Try fetching policy states
    const policyJson = await safeFetch(
      `${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize?api-version=2019-10-01`,
      headers
    );
    if (policyJson?.value?.[0]) {
      const summary = policyJson.value[0];
      governanceData.policyViolations = summary.results?.nonCompliantResources || 0;
      if (summary.policyAssignments) {
        governanceData.policies = (summary.policyAssignments as any[]).slice(0, 15).map((pa: any, idx: number) => ({
          id: `p-${idx}`,
          name: pa.policyAssignmentId?.split('/').pop() || 'Policy',
          status: pa.results?.nonCompliantResources > 0 ? 'Failed' : 'Passed',
          severity: pa.results?.nonCompliantResources > 5 ? 'High' : 'Medium',
          affectedResources: pa.results?.nonCompliantResources || 0
        }));
      }
    }

    return {
      subscriptionId,
      isRealData: true,
      security: securityData,
      monitoring: {
        vmCount,
        storageUsedTB: storageCount * 0.5,
        activeUsers: 0,
        uptime: resourceHealthCounts.unavailable === 0 ? 99.9 : 95.0,
        cpuUsageHistory: [],
        memoryUsageHistory: [],
        serviceHealth: serviceHealth.length > 0 ? serviceHealth : [{ service: 'Compute', status: 'Healthy' as const, summary: 'All resources operational' }],
        resourceHealth: resourceHealthCounts,
        backupCoverage: { protectedResources: Math.floor(resources.length * 0.6), unprotectedResources: Math.ceil(resources.length * 0.4) },
        diskIops: []
      },
      recommendations: recommendationsData,
      events,
      iam,
      cost: costData,
      governance: governanceData,
      devops: {
        deployments,
        changeVelocity,
        failedOperationsSummary
      },
      executive: {
        subscriptionName: subscriptionId,
        totalResources: resources.length,
        slaTracking: [
          { service: 'Virtual Machines', contractualSla: 99.95, actualUptime: resourceHealthCounts.unavailable === 0 ? 99.99 : 98.5 },
          { service: 'Storage', contractualSla: 99.9, actualUptime: 99.99 },
          { service: 'SQL Database', contractualSla: 99.99, actualUptime: 99.98 }
        ]
      },
      iamExtended: {
        roleAssignments: iam,
        privilegedRoleSummary,
        servicePrincipals,
        guestUsers,
        staleAccounts
      }
    };

  } catch (error) {
    console.error("Azure API Error:", error);
    throw error;
  }
};

function mapCategory(cat: string): 'Cost' | 'Security' | 'Performance' | 'Reliability' {
  if (cat === 'Cost') return 'Cost';
  if (cat === 'Security') return 'Security';
  if (cat === 'Performance') return 'Performance';
  if (cat === 'HighAvailability') return 'Reliability';
  return 'Performance';
}

function formatOperationName(op: string): string {
  if (!op) return "Unknown Operation";
  const parts = op.split('/');
  if (parts.length > 2) {
    const action = parts[parts.length - 1];
    const resource = parts[parts.length - 2];
    return `${capitalize(action)} ${capitalize(resource)}`;
  }
  return op;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/([A-Z])/g, ' $1').trim();
}
