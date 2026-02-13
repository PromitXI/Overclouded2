export interface SecurityData {
  score: number;
  activeThreats: number;
  complianceScore: number;
  criticalVulnerabilities: number;
  alerts: Array<{
    id: string;
    severity: 'High' | 'Medium' | 'Low';
    description: string;
    time: string;
  }>;
  // New: Regulatory Compliance
  regulatoryCompliance: Array<{
    framework: string; // e.g. 'CIS', 'ISO 27001', 'PCI-DSS', 'NIST'
    passedControls: number;
    failedControls: number;
    totalControls: number;
  }>;
  // New: Network Security
  networkSecurity: {
    openNsgRules: number;
    publicIps: number;
    unprotectedEndpoints: number;
  };
  // New: Encryption Status
  encryptionStatus: {
    encryptedResources: number;
    unencryptedResources: number;
  };
  // New: Key Vault Health
  keyVaultHealth: {
    totalSecrets: number;
    expiringSecrets: number;
    totalCertificates: number;
    expiringCertificates: number;
  };
}

export interface CostData {
  currentMonthCost: number;
  forecastedCost: number;
  budget: number;
  costTrend: Array<{ date: string; value: number; type: 'Actual' | 'Forecast' }>;
  costByService: Array<{ name: string; value: number }>;
  riCoverage: number; // Reserved Instance Coverage %
  potentialSavings: number;
  // New: Cost by Resource Group
  costByResourceGroup: Array<{ name: string; value: number }>;
  // New: Cost by Region
  costByRegion: Array<{ name: string; value: number }>;
  // New: Month-over-Month
  monthOverMonthChange: number; // percentage change vs previous month
  // New: Cost Anomalies
  costAnomalies: Array<{
    date: string;
    expectedCost: number;
    actualCost: number;
    service: string;
  }>;
}

export interface GovernanceData {
  healthScore: number;
  policyViolations: number;
  taggingCompliance: number;
  zombieAssets: number; // Unused resources
  policies: Array<{
    id: string;
    name: string;
    status: 'Passed' | 'Failed' | 'Warning';
    severity: 'High' | 'Medium' | 'Low';
    affectedResources: number;
  }>;
  // New: Resource Inventory by Type
  resourcesByType: Array<{ type: string; count: number }>;
  // New: Resource Inventory by Region
  resourcesByRegion: Array<{ region: string; count: number }>;
  // New: Orphaned Resources Detail
  orphanedResources: Array<{
    id: string;
    name: string;
    type: string; // e.g. 'Unattached Disk', 'Unused Public IP', 'Empty NIC'
    estimatedMonthlyCost: number;
  }>;
  // New: Subscription Limits / Quotas
  subscriptionQuotas: Array<{
    name: string;
    currentUsage: number;
    limit: number;
  }>;
  // New: Naming Convention Compliance
  namingCompliancePercent: number;
}

export interface MonitoringData {
  vmCount: number;
  storageUsedTB: number;
  activeUsers: number;
  uptime: number;
  cpuUsageHistory: Array<{ time: string; value: number }>;
  memoryUsageHistory: Array<{ time: string; value: number }>;
  // New: Service Health
  serviceHealth: Array<{
    service: string;
    status: 'Healthy' | 'Degraded' | 'Unavailable';
    summary: string;
  }>;
  // New: Resource Health
  resourceHealth: {
    healthy: number;
    degraded: number;
    unavailable: number;
  };
  // New: Backup Coverage
  backupCoverage: {
    protectedResources: number;
    unprotectedResources: number;
  };
  // New: Network Throughput (optional)
  diskIops: Array<{ time: string; value: number }>;
}

export interface RecommendationData {
  monthlySavings: number;
  efficiencyScore: number;
  items: Array<{
    id: string;
    category: 'Cost' | 'Security' | 'Performance' | 'Reliability';
    impact: 'High' | 'Medium' | 'Low';
    description: string;
    savings?: number;
  }>;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  operationName: string;
  status: 'Succeeded' | 'Failed' | 'Started' | 'Unknown';
  caller: string;
  resourceGroup: string;
  description: string;
  color?: string;
}

// New: DevOps interfaces
export interface DeploymentEntry {
  id: string;
  name: string;
  resourceGroup: string;
  status: 'Succeeded' | 'Failed' | 'Running' | 'Canceled';
  timestamp: string;
  duration: string;
}

export interface IAMRoleAssignment {
  id: string;
  principalId: string;
  principalName: string;
  principalType: 'User' | 'Group' | 'ServicePrincipal' | 'Unknown';
  roleName: string;
}

// New: Executive / Reporting data
export interface ExecutiveData {
  // Multi-subscription comparison (if available)
  subscriptionName: string;
  totalResources: number;
  // SLA tracking
  slaTracking: Array<{
    service: string;
    contractualSla: number;
    actualUptime: number;
  }>;
}

// New: DevOps data
export interface DevOpsData {
  deployments: DeploymentEntry[];
  changeVelocity: Array<{ date: string; changes: number }>;
  failedOperationsSummary: Array<{ operation: string; count: number }>;
}

// New: IAM extended data
export interface IAMExtendedData {
  roleAssignments: IAMRoleAssignment[];
  privilegedRoleSummary: {
    owners: number;
    contributors: number;
    globalAdmins: number;
  };
  servicePrincipals: Array<{
    name: string;
    roleName: string;
    credentialExpiry: string;
  }>;
  guestUsers: number;
  staleAccounts: number; // not signed in 90+ days
}

export interface DashboardData {
  subscriptionId: string;
  isRealData: boolean;
  security: SecurityData;
  cost: CostData;
  governance: GovernanceData;
  monitoring: MonitoringData;
  recommendations: RecommendationData;
  events: ActivityLogEntry[];
  iam: IAMRoleAssignment[];
  // New data sections
  devops: DevOpsData;
  executive: ExecutiveData;
  iamExtended: IAMExtendedData;
}

export enum AppState {
  LOGIN = 'LOGIN',
  AUTHENTICATING = 'AUTHENTICATING',
  SCANNING = 'SCANNING',
  DASHBOARD = 'DASHBOARD',
  ERROR = 'ERROR'
}