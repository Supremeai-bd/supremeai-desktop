import { CustomerRecord, McpTowerService } from '../types';

export class DataTransformer {
  static transformCustomer(mockCustomer: Partial<CustomerRecord>): CustomerRecord {
    return {
      id: mockCustomer.id || `cust_${Date.now()}`,
      name: mockCustomer.name || 'Unknown',
      email: mockCustomer.email || `user_${Date.now()}@example.com`,
      tier: mockCustomer.tier || 'Free',
      status: mockCustomer.status || 'active',
      mrr: typeof mockCustomer.mrr === 'number' ? mockCustomer.mrr : 0,
      tokensUsed: typeof mockCustomer.tokensUsed === 'number' ? mockCustomer.tokensUsed : 0,
      tokenLimit: typeof mockCustomer.tokenLimit === 'number' ? mockCustomer.tokenLimit : 100000,
      connectedRepos:
        typeof mockCustomer.connectedRepos === 'number' ? mockCustomer.connectedRepos : 0,
      joinedDate: mockCustomer.joinedDate || new Date().toISOString().split('T')[0],
      lastActive: mockCustomer.lastActive || 'Just now',
      githubHandle: mockCustomer.githubHandle,
      region: mockCustomer.region || 'Asia/Dhaka',
      isDeveloperEligible: mockCustomer.isDeveloperEligible || false,
    };
  }

  static transformMcpService(mockService: Partial<McpTowerService>): McpTowerService {
    return {
      id: mockService.id || `mcp_${Date.now()}`,
      name: mockService.name || mockService.id || 'service',
      displayName: mockService.displayName || mockService.name || mockService.id || 'service',
      category: mockService.category || 'core',
      port: typeof mockService.port === 'number' ? mockService.port : 0,
      status: mockService.status || 'healthy',
      uptime: mockService.uptime || '—',
      latencyMs: typeof mockService.latencyMs === 'number' ? mockService.latencyMs : 0,
      cpuPercent: typeof mockService.cpuPercent === 'number' ? mockService.cpuPercent : 0,
      memoryMb: typeof mockService.memoryMb === 'number' ? mockService.memoryMb : 0,
      lastChecked: mockService.lastChecked || 'Just now',
      version: mockService.version || 'v1.0.0',
      endpoint: mockService.endpoint || '',
      errorCount: typeof mockService.errorCount === 'number' ? mockService.errorCount : 0,
      logs: Array.isArray(mockService.logs) ? mockService.logs : [],
      deployStatus: mockService.deployStatus,
      monthlyBuildMinutes: mockService.monthlyBuildMinutes,
      freeLimitRemainingMinutes: mockService.freeLimitRemainingMinutes,
      freeLimitExhausted: mockService.freeLimitExhausted,
      deployAgeDays: mockService.deployAgeDays,
      commitSha: mockService.commitSha,
      freshness: mockService.freshness,
    };
  }

  static transformCustomerBatch(mockCustomers: Partial<CustomerRecord>[]): CustomerRecord[] {
    return mockCustomers.map((customer) => this.transformCustomer(customer));
  }

  static validateCustomerData(customer: Partial<CustomerRecord>): string[] {
    const errors: string[] = [];

    if (!customer.name || customer.name.trim().length === 0) {
      errors.push('নাম প্রয়োজন');
    }
    if (!customer.email || !this.isValidEmail(customer.email)) {
      errors.push('ভ্যালিড ইমেইল প্রয়োজন');
    }
    if (customer.mrr !== undefined && customer.mrr < 0) {
      errors.push('MRR নেগেটিভ হতে পারবে না');
    }

    return errors;
  }

  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
