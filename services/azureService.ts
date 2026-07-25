import { DashboardData, ActivityLogEntry, IAMRoleAssignment, DeploymentEntry } from "../types";

const AZURE_MGMT_URL = "https://management.azure.com";

interface AzureResource {
  id: string;
  name: string;
  type: string;
  location: string;
  tags?: Record<string, string>;
  properties?: Record<string, any>;
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

// Preserve non-critical API failures so missing data is not presented as a real zero.
async function fetchJson(url: string, headers: Record<string, string>, failures: string[]): Promise<any | null> {
  try {
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      failures.push(`${new URL(url).pathname} (${resp.status})`);
      return null;
    }
    return await resp.json();
  } catch (error) {
    failures.push(`${new URL(url).pathname} (${error instanceof Error ? error.message : 'network error'})`);
    return null;
  }
}

export const fetchAzureData = async (subscriptionId: string, accessToken: string): Promise<DashboardData> => {
  const failedRequests: string[] = [];
  const safeFetch = (url: string, requestHeaders: Record<string, string>) => fetchJson(url, requestHeaders, failedRequests);
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
    if (!resourcesJson) {
      throw new Error('Azure resource inventory could not be read. Check subscription access and try again.');
    }
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

    // Query full resource properties; the generic inventory cannot tell whether an
    // asset is attached. Only report resources Azure explicitly marks as unused.
    const [disksJson, publicIpsJson, nicsJson, nsgJson] = await Promise.all([
      safeFetch(`${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Compute/disks?api-version=2023-10-02`, headers),
      safeFetch(`${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Network/publicIPAddresses?api-version=2023-09-01`, headers),
      safeFetch(`${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Network/networkInterfaces?api-version=2023-09-01`, headers),
      safeFetch(`${AZURE_MGMT_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Network/networkSecurityGroups?api-version=2023-09-01`, headers)
    ]);
    const unattachedDisks: AzureResource[] = (disksJson?.value || []).filter((r: AzureResource) => r.properties?.diskState === 'Unattached');
    const unusedPublicIps: AzureResource[] = (publicIpsJson?.value || []).filter((r: AzureResource) => !r.properties?.ipConfiguration);
    const emptyNics: AzureResource[] = (nicsJson?.value || []).filter((r: AzureResource) => !r.properties?.virtualMachine && !r.properties?.privateEndpoint);
    const orphanedResources = [
      ...unattachedDisks.map(r => ({ id: r.id, name: r.name, type: 'Unattached Disk', estimatedMonthlyCost: 0 })),
      ...unusedPublicIps.map(r => ({ id: r.id, name: r.name, type: 'Unused Public IP', estimatedMonthlyCost: 0 })),
      ...emptyNics.map(r => ({ id: r.id, name: r.name, type: 'Unattached NIC', estimatedMonthlyCost: 0 }))
    ].slice(0, 20);

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
    const publicIps = (publicIpsJson?.value || []) as AzureResource[];
    const nsgs = (nsgJson?.value || []) as AzureResource[];
    const openNsgRules = nsgs.flatMap(nsg => nsg.properties?.securityRules || []).filter((rule: any) => {
      const p = rule.properties || {};
      const sources = [p.sourceAddressPrefix, ...(p.sourceAddressPrefixes || [])];
      return p.direction === 'Inbound' && p.access === 'Allow' && sources.some((source: string) => source === '*' || source === 'Internet' || source === '0.0.0.0/0');
    }).length;
    securityData.networkSecurity = {
      openNsgRules,
      publicIps: publicIps.length,
      unprotectedEndpoints: unusedPublicIps.length
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

    const healthEntries = (healthJson?.value || []) as any[];
    const resourceHealthCounts = {
      healthy: healthEntries.filter(h => h.properties?.availabilityState === 'Available').length,
      degraded: healthEntries.filter(h => h.properties?.availabilityState === 'Degraded').length,
      unavailable: healthEntries.filter(h => !['Available', 'Degraded'].includes(h.properties?.availabilityState)).length
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

    // These metrics require APIs/queries that are not implemented yet. Mark them
    // unavailable instead of manufacturing estimates that look authoritative.
    failedRequests.push('Cost Management metrics are not yet collected');
    failedRequests.push('Azure Monitor CPU, memory, storage usage and IOPS are not yet collected');
    failedRequests.push('Backup coverage and measured SLA history are not yet collected');

    return {
      subscriptionId,
      isRealData: true,
      dataQuality: {
        status: failedRequests.length > 0 ? 'partial' : 'complete',
        warnings: failedRequests
      },
      security: securityData,
      monitoring: {
        vmCount,
        storageUsedTB: 0,
        activeUsers: 0,
        uptime: 0,
        cpuUsageHistory: [],
        memoryUsageHistory: [],
        serviceHealth,
        resourceHealth: resourceHealthCounts,
        backupCoverage: { protectedResources: 0, unprotectedResources: 0 },
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
        slaTracking: []
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
