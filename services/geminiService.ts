import { DashboardData } from "../types";

// Demo generation happens on the server so the Gemini key is never shipped in browser JavaScript.
export const generateFallbackData = async (subscriptionId: string): Promise<DashboardData> => {
  try {
    const response = await fetch('/api/generate-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId })
    });
    if (!response.ok) throw new Error('Demo generator unavailable');
    const generated = await response.json();
    if (!generated?.security || !generated?.cost || !generated?.governance || !generated?.monitoring) {
      throw new Error('Demo generator returned incomplete data');
    }
    return { ...generated, subscriptionId, isRealData: false, dataQuality: { status: 'demo', warnings: [] } } as DashboardData;
  } catch (error) {
    console.warn('Using static demo data:', error);
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
