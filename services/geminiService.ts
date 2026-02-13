import { GoogleGenAI, Type } from "@google/genai";
import { DashboardData } from "../types";

export const generateFallbackData = async (subscriptionId: string): Promise<DashboardData> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Using static fallback data.");
    return getStaticFallback(subscriptionId);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a highly detailed "Overclouded" style JSON analysis for Azure subscription '${subscriptionId}'.
      The data must represent an enterprise-grade environment with realistic numbers.
      
      Include ALL these sections:
      1. **Security**: score, threats, compliance, vulnerabilities, alerts, regulatoryCompliance (CIS/ISO/PCI/NIST), networkSecurity, encryptionStatus, keyVaultHealth
      2. **Cost (FinOps)**: cost history (actual vs forecast), breakdown by service/region/resourceGroup, RI coverage, anomalies, month-over-month change
      3. **Governance**: Policy violations, tagging, zombie assets, resourcesByType, resourcesByRegion, orphanedResources, subscriptionQuotas, namingCompliance
      4. **Monitoring**: VMs, storage, uptime, cpu/memory history, serviceHealth, resourceHealth, backupCoverage
      5. **Recommendations**: advisor items with savings
      6. **Events**: activity log entries
      7. **IAM**: role assignments
      8. **DevOps**: deployments, changeVelocity, failedOperationsSummary
      9. **Executive**: subscription summary, SLA tracking
      10. **IAM Extended**: privileged roles, service principals, guest users, stale accounts
      
      JSON Schema strict adherence required.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            security: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                activeThreats: { type: Type.NUMBER },
                complianceScore: { type: Type.NUMBER },
                criticalVulnerabilities: { type: Type.NUMBER },
                alerts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, severity: { type: Type.STRING }, description: { type: Type.STRING }, time: { type: Type.STRING } } } },
                regulatoryCompliance: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { framework: { type: Type.STRING }, passedControls: { type: Type.NUMBER }, failedControls: { type: Type.NUMBER }, totalControls: { type: Type.NUMBER } } } },
                networkSecurity: { type: Type.OBJECT, properties: { openNsgRules: { type: Type.NUMBER }, publicIps: { type: Type.NUMBER }, unprotectedEndpoints: { type: Type.NUMBER } } },
                encryptionStatus: { type: Type.OBJECT, properties: { encryptedResources: { type: Type.NUMBER }, unencryptedResources: { type: Type.NUMBER } } },
                keyVaultHealth: { type: Type.OBJECT, properties: { totalSecrets: { type: Type.NUMBER }, expiringSecrets: { type: Type.NUMBER }, totalCertificates: { type: Type.NUMBER }, expiringCertificates: { type: Type.NUMBER } } }
              }
            },
            cost: {
              type: Type.OBJECT,
              properties: {
                currentMonthCost: { type: Type.NUMBER },
                forecastedCost: { type: Type.NUMBER },
                budget: { type: Type.NUMBER },
                riCoverage: { type: Type.NUMBER },
                potentialSavings: { type: Type.NUMBER },
                monthOverMonthChange: { type: Type.NUMBER },
                costTrend: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, value: { type: Type.NUMBER }, type: { type: Type.STRING } } } },
                costByService: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } } } },
                costByResourceGroup: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } } } },
                costByRegion: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } } } },
                costAnomalies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, expectedCost: { type: Type.NUMBER }, actualCost: { type: Type.NUMBER }, service: { type: Type.STRING } } } }
              }
            },
            governance: {
              type: Type.OBJECT,
              properties: {
                healthScore: { type: Type.NUMBER },
                policyViolations: { type: Type.NUMBER },
                taggingCompliance: { type: Type.NUMBER },
                zombieAssets: { type: Type.NUMBER },
                namingCompliancePercent: { type: Type.NUMBER },
                policies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, status: { type: Type.STRING }, severity: { type: Type.STRING }, affectedResources: { type: Type.NUMBER } } } },
                resourcesByType: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, count: { type: Type.NUMBER } } } },
                resourcesByRegion: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { region: { type: Type.STRING }, count: { type: Type.NUMBER } } } },
                orphanedResources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, type: { type: Type.STRING }, estimatedMonthlyCost: { type: Type.NUMBER } } } },
                subscriptionQuotas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, currentUsage: { type: Type.NUMBER }, limit: { type: Type.NUMBER } } } }
              }
            },
            monitoring: {
              type: Type.OBJECT,
              properties: {
                vmCount: { type: Type.NUMBER },
                storageUsedTB: { type: Type.NUMBER },
                activeUsers: { type: Type.NUMBER },
                uptime: { type: Type.NUMBER },
                cpuUsageHistory: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { time: { type: Type.STRING }, value: { type: Type.NUMBER } } } },
                memoryUsageHistory: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { time: { type: Type.STRING }, value: { type: Type.NUMBER } } } },
                serviceHealth: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { service: { type: Type.STRING }, status: { type: Type.STRING }, summary: { type: Type.STRING } } } },
                resourceHealth: { type: Type.OBJECT, properties: { healthy: { type: Type.NUMBER }, degraded: { type: Type.NUMBER }, unavailable: { type: Type.NUMBER } } },
                backupCoverage: { type: Type.OBJECT, properties: { protectedResources: { type: Type.NUMBER }, unprotectedResources: { type: Type.NUMBER } } },
                diskIops: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { time: { type: Type.STRING }, value: { type: Type.NUMBER } } } }
              }
            },
            recommendations: {
              type: Type.OBJECT,
              properties: {
                monthlySavings: { type: Type.NUMBER },
                efficiencyScore: { type: Type.NUMBER },
                items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, category: { type: Type.STRING }, impact: { type: Type.STRING }, description: { type: Type.STRING }, savings: { type: Type.NUMBER } } } }
              }
            },
            events: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, timestamp: { type: Type.STRING }, operationName: { type: Type.STRING }, status: { type: Type.STRING }, caller: { type: Type.STRING }, resourceGroup: { type: Type.STRING }, description: { type: Type.STRING } } } },
            iam: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, principalId: { type: Type.STRING }, principalName: { type: Type.STRING }, principalType: { type: Type.STRING }, roleName: { type: Type.STRING } } } },
            devops: {
              type: Type.OBJECT,
              properties: {
                deployments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, resourceGroup: { type: Type.STRING }, status: { type: Type.STRING }, timestamp: { type: Type.STRING }, duration: { type: Type.STRING } } } },
                changeVelocity: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, changes: { type: Type.NUMBER } } } },
                failedOperationsSummary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { operation: { type: Type.STRING }, count: { type: Type.NUMBER } } } }
              }
            },
            executive: {
              type: Type.OBJECT,
              properties: {
                subscriptionName: { type: Type.STRING },
                totalResources: { type: Type.NUMBER },
                slaTracking: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { service: { type: Type.STRING }, contractualSla: { type: Type.NUMBER }, actualUptime: { type: Type.NUMBER } } } }
              }
            },
            iamExtended: {
              type: Type.OBJECT,
              properties: {
                privilegedRoleSummary: { type: Type.OBJECT, properties: { owners: { type: Type.NUMBER }, contributors: { type: Type.NUMBER }, globalAdmins: { type: Type.NUMBER } } },
                servicePrincipals: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, roleName: { type: Type.STRING }, credentialExpiry: { type: Type.STRING } } } },
                guestUsers: { type: Type.NUMBER },
                staleAccounts: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const p = JSON.parse(text);
    return {
      subscriptionId,
      isRealData: false,
      security: p.security,
      cost: p.cost,
      governance: p.governance,
      monitoring: p.monitoring,
      recommendations: p.recommendations,
      events: p.events,
      iam: p.iam,
      devops: p.devops || { deployments: [], changeVelocity: [], failedOperationsSummary: [] },
      executive: p.executive || { subscriptionName: subscriptionId, totalResources: 0, slaTracking: [] },
      iamExtended: p.iamExtended || { roleAssignments: p.iam || [], privilegedRoleSummary: { owners: 0, contributors: 0, globalAdmins: 0 }, servicePrincipals: [], guestUsers: 0, staleAccounts: 0 }
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return getStaticFallback(subscriptionId);
  }
};

const getStaticFallback = (subId: string): DashboardData => ({
  subscriptionId: subId,
  isRealData: false,
  security: {
    score: 72,
    activeThreats: 3,
    complianceScore: 85,
    criticalVulnerabilities: 5,
    alerts: [
      { id: '1', severity: 'High', description: 'SQL Injection attempt detected on webapp-prod', time: '10m ago' },
      { id: '2', severity: 'Medium', description: 'Brute force attack on SSH port 22', time: '1h ago' },
      { id: '3', severity: 'Low', description: 'Anomalous login from new geography', time: '3h ago' }
    ],
    regulatoryCompliance: [
      { framework: 'CIS Microsoft Azure Foundations', passedControls: 42, failedControls: 8, totalControls: 50 },
      { framework: 'ISO 27001:2013', passedControls: 85, failedControls: 15, totalControls: 100 },
      { framework: 'PCI DSS v3.2.1', passedControls: 55, failedControls: 5, totalControls: 60 },
      { framework: 'NIST SP 800-53 Rev. 5', passedControls: 120, failedControls: 30, totalControls: 150 }
    ],
    networkSecurity: { openNsgRules: 12, publicIps: 8, unprotectedEndpoints: 3 },
    encryptionStatus: { encryptedResources: 45, unencryptedResources: 7 },
    keyVaultHealth: { totalSecrets: 24, expiringSecrets: 3, totalCertificates: 8, expiringCertificates: 1 }
  },
  cost: {
    currentMonthCost: 12450,
    forecastedCost: 15200,
    budget: 14000,
    riCoverage: 45,
    potentialSavings: 3200,
    monthOverMonthChange: 8.5,
    costTrend: [
      { date: 'Day 1', value: 400, type: 'Actual' }, { date: 'Day 5', value: 450, type: 'Actual' },
      { date: 'Day 10', value: 420, type: 'Actual' }, { date: 'Day 15', value: 500, type: 'Actual' },
      { date: 'Day 20', value: 520, type: 'Forecast' }, { date: 'Day 25', value: 550, type: 'Forecast' },
      { date: 'Day 30', value: 530, type: 'Forecast' }
    ],
    costByService: [
      { name: 'Virtual Machines', value: 4200 }, { name: 'SQL Database', value: 2800 },
      { name: 'Storage', value: 1900 }, { name: 'App Service', value: 1500 },
      { name: 'Networking', value: 1100 }, { name: 'Key Vault', value: 450 },
      { name: 'Monitor', value: 300 }, { name: 'Other', value: 200 }
    ],
    costByResourceGroup: [
      { name: 'rg-production', value: 5500 }, { name: 'rg-staging', value: 3200 },
      { name: 'rg-development', value: 2100 }, { name: 'rg-shared-infra', value: 1650 }
    ],
    costByRegion: [
      { name: 'East US', value: 5800 }, { name: 'West Europe', value: 3400 },
      { name: 'Southeast Asia', value: 2100 }, { name: 'Central US', value: 1150 }
    ],
    costAnomalies: [
      { date: '2026-02-05', expectedCost: 420, actualCost: 680, service: 'Virtual Machines' },
      { date: '2026-02-09', expectedCost: 350, actualCost: 520, service: 'SQL Database' }
    ]
  },
  governance: {
    healthScore: 78,
    policyViolations: 12,
    taggingCompliance: 65,
    zombieAssets: 8,
    namingCompliancePercent: 72,
    policies: [
      { id: 'p1', name: 'Require Cost Center Tag', status: 'Failed', severity: 'Medium', affectedResources: 14 },
      { id: 'p2', name: 'Storage Account Secure Transfer', status: 'Passed', severity: 'High', affectedResources: 0 },
      { id: 'p3', name: 'No Public IP on DB', status: 'Warning', severity: 'High', affectedResources: 2 },
      { id: 'p4', name: 'Enforce HTTPS only', status: 'Passed', severity: 'High', affectedResources: 0 },
      { id: 'p5', name: 'Disk Encryption Required', status: 'Failed', severity: 'High', affectedResources: 7 }
    ],
    resourcesByType: [
      { type: 'virtualMachines', count: 42 }, { type: 'storageAccounts', count: 18 },
      { type: 'sqlDatabases', count: 12 }, { type: 'webApps', count: 8 },
      { type: 'networkInterfaces', count: 45 }, { type: 'publicIPAddresses', count: 8 },
      { type: 'disks', count: 52 }, { type: 'loadBalancers', count: 4 },
      { type: 'keyVaults', count: 3 }, { type: 'containerRegistries', count: 2 }
    ],
    resourcesByRegion: [
      { region: 'eastus', count: 65 }, { region: 'westeurope', count: 42 },
      { region: 'southeastasia', count: 28 }, { region: 'centralus', count: 15 }
    ],
    orphanedResources: [
      { id: 'o1', name: 'disk-old-webserver-01', type: 'Unattached Disk', estimatedMonthlyCost: 25 },
      { id: 'o2', name: 'pip-legacy-app', type: 'Unused Public IP', estimatedMonthlyCost: 5 },
      { id: 'o3', name: 'nic-decom-vm-03', type: 'Empty NIC', estimatedMonthlyCost: 0 },
      { id: 'o4', name: 'disk-test-backup-02', type: 'Unattached Disk', estimatedMonthlyCost: 35 },
      { id: 'o5', name: 'pip-temp-migration', type: 'Unused Public IP', estimatedMonthlyCost: 5 }
    ],
    subscriptionQuotas: [
      { name: 'Total Regional vCPUs', currentUsage: 48, limit: 200 },
      { name: 'Standard DSv3 Family vCPUs', currentUsage: 24, limit: 100 },
      { name: 'Storage Accounts', currentUsage: 18, limit: 250 },
      { name: 'Public IP Addresses', currentUsage: 8, limit: 60 },
      { name: 'Network Security Groups', currentUsage: 12, limit: 100 }
    ]
  },
  monitoring: {
    vmCount: 42,
    storageUsedTB: 12.5,
    activeUsers: 1540,
    uptime: 99.98,
    cpuUsageHistory: [
      { time: '00:00', value: 35 }, { time: '04:00', value: 28 }, { time: '08:00', value: 55 },
      { time: '12:00', value: 85 }, { time: '16:00', value: 72 }, { time: '20:00', value: 45 }
    ],
    memoryUsageHistory: [
      { time: '00:00', value: 55 }, { time: '04:00', value: 50 }, { time: '08:00', value: 68 },
      { time: '12:00', value: 88 }, { time: '16:00', value: 78 }, { time: '20:00', value: 62 }
    ],
    serviceHealth: [
      { service: 'Virtual Machines', status: 'Healthy', summary: 'All 42 VMs operational' },
      { service: 'SQL Database', status: 'Healthy', summary: '12 databases running normally' },
      { service: 'App Service', status: 'Degraded', summary: '1 of 8 apps experiencing latency' },
      { service: 'Storage', status: 'Healthy', summary: '18 accounts accessible' }
    ],
    resourceHealth: { healthy: 140, degraded: 3, unavailable: 1 },
    backupCoverage: { protectedResources: 95, unprotectedResources: 18 },
    diskIops: [
      { time: '00:00', value: 1200 }, { time: '04:00', value: 800 }, { time: '08:00', value: 3500 },
      { time: '12:00', value: 5200 }, { time: '16:00', value: 4100 }, { time: '20:00', value: 2200 }
    ]
  },
  recommendations: {
    monthlySavings: 3200,
    efficiencyScore: 68,
    items: [
      { id: '1', category: 'Cost', impact: 'High', description: 'Resize 8 underutilized B-series VMs to A-series', savings: 850 },
      { id: '2', category: 'Cost', impact: 'High', description: 'Purchase Reserved Instances for prod workloads', savings: 1200 },
      { id: '3', category: 'Security', impact: 'High', description: 'Enable Azure Defender for SQL databases', savings: 0 },
      { id: '4', category: 'Performance', impact: 'Medium', description: 'Enable autoscaling for App Service plan', savings: 300 },
      { id: '5', category: 'Cost', impact: 'Medium', description: 'Delete 5 orphaned managed disks', savings: 125 },
      { id: '6', category: 'Reliability', impact: 'High', description: 'Enable Availability Zones for production VMs', savings: 0 },
      { id: '7', category: 'Security', impact: 'Medium', description: 'Rotate expiring Key Vault secrets', savings: 0 },
      { id: '8', category: 'Cost', impact: 'Low', description: 'Move cold storage to Cool/Archive tier', savings: 425 }
    ]
  },
  events: [
    { id: 'e1', timestamp: '2026-02-13T09:15:00Z', operationName: 'Create VirtualMachine', status: 'Succeeded', caller: 'admin@contoso.com', resourceGroup: 'rg-production', description: 'Created VM web-prod-04' },
    { id: 'e2', timestamp: '2026-02-13T08:30:00Z', operationName: 'Update NetworkSecurityGroup', status: 'Succeeded', caller: 'netops@contoso.com', resourceGroup: 'rg-shared-infra', description: 'Updated NSG rules' },
    { id: 'e3', timestamp: '2026-02-12T16:45:00Z', operationName: 'Delete StorageAccount', status: 'Failed', caller: 'dev@contoso.com', resourceGroup: 'rg-development', description: 'Failed to delete storage - lock present' },
    { id: 'e4', timestamp: '2026-02-12T14:20:00Z', operationName: 'Restart VirtualMachine', status: 'Succeeded', caller: 'system', resourceGroup: 'rg-production', description: 'Auto-restart triggered by health probe' },
    { id: 'e5', timestamp: '2026-02-12T10:00:00Z', operationName: 'Create Deployment', status: 'Succeeded', caller: 'devops-pipeline', resourceGroup: 'rg-staging', description: 'ARM template deployment v2.4.1' },
    { id: 'e6', timestamp: '2026-02-11T22:00:00Z', operationName: 'Scale AppServicePlan', status: 'Succeeded', caller: 'autoscale', resourceGroup: 'rg-production', description: 'Scaled out to 4 instances' }
  ],
  iam: [
    { id: 'i1', principalId: 'p1', principalName: 'admin@contoso.com', principalType: 'User', roleName: 'Owner' },
    { id: 'i2', principalId: 'p2', principalName: 'devops-sp', principalType: 'ServicePrincipal', roleName: 'Contributor' },
    { id: 'i3', principalId: 'p3', principalName: 'dev-team', principalType: 'Group', roleName: 'Contributor' },
    { id: 'i4', principalId: 'p4', principalName: 'readonly-auditor', principalType: 'User', roleName: 'Reader' },
    { id: 'i5', principalId: 'p5', principalName: 'backup-sp', principalType: 'ServicePrincipal', roleName: 'Backup Contributor' },
    { id: 'i6', principalId: 'p6', principalName: 'security-team', principalType: 'Group', roleName: 'Security Reader' },
    { id: 'i7', principalId: 'p7', principalName: 'guest@partner.com', principalType: 'User', roleName: 'Reader' }
  ],
  devops: {
    deployments: [
      { id: 'd1', name: 'webapp-v2.4.1', resourceGroup: 'rg-production', status: 'Succeeded', timestamp: '2026-02-13T08:00:00Z', duration: '4m 12s' },
      { id: 'd2', name: 'api-hotfix-312', resourceGroup: 'rg-production', status: 'Succeeded', timestamp: '2026-02-12T15:30:00Z', duration: '2m 45s' },
      { id: 'd3', name: 'infra-update-feb', resourceGroup: 'rg-shared-infra', status: 'Failed', timestamp: '2026-02-12T10:00:00Z', duration: '8m 30s' },
      { id: 'd4', name: 'staging-release-rc1', resourceGroup: 'rg-staging', status: 'Succeeded', timestamp: '2026-02-11T16:00:00Z', duration: '5m 20s' },
      { id: 'd5', name: 'db-migration-v3', resourceGroup: 'rg-production', status: 'Succeeded', timestamp: '2026-02-10T22:00:00Z', duration: '12m 05s' }
    ],
    changeVelocity: [
      { date: '2026-02-07', changes: 12 }, { date: '2026-02-08', changes: 8 },
      { date: '2026-02-09', changes: 15 }, { date: '2026-02-10', changes: 22 },
      { date: '2026-02-11', changes: 18 }, { date: '2026-02-12', changes: 25 },
      { date: '2026-02-13', changes: 14 }
    ],
    failedOperationsSummary: [
      { operation: 'Delete StorageAccount', count: 3 },
      { operation: 'Update NetworkSecurityGroup', count: 2 },
      { operation: 'Create VirtualMachine', count: 1 }
    ]
  },
  executive: {
    subscriptionName: 'Enterprise Production',
    totalResources: 150,
    slaTracking: [
      { service: 'Virtual Machines', contractualSla: 99.95, actualUptime: 99.99 },
      { service: 'SQL Database', contractualSla: 99.99, actualUptime: 99.98 },
      { service: 'App Service', contractualSla: 99.95, actualUptime: 99.85 },
      { service: 'Storage', contractualSla: 99.9, actualUptime: 100.0 },
      { service: 'Key Vault', contractualSla: 99.99, actualUptime: 100.0 }
    ]
  },
  iamExtended: {
    roleAssignments: [],
    privilegedRoleSummary: { owners: 2, contributors: 5, globalAdmins: 1 },
    servicePrincipals: [
      { name: 'devops-sp', roleName: 'Contributor', credentialExpiry: '2026-05-15' },
      { name: 'backup-sp', roleName: 'Backup Contributor', credentialExpiry: '2026-03-01' },
      { name: 'monitoring-sp', roleName: 'Monitoring Reader', credentialExpiry: '2026-08-22' }
    ],
    guestUsers: 3,
    staleAccounts: 5
  }
});
