// infrastructure/bin/project-config.ts

export interface StackToggles {
  // Core stacks (always deployed when backend is targeted)
  vpc: true;        // Required - cannot be disabled
  database: true;   // Required - cannot be disabled
  iam: true;        // Required - cannot be disabled
  lambda: true;     // Required - cannot be disabled
  monitoring: true; // Required - Lambda/API GW alarms always deployed
  frontend: true;   // Required when frontend is targeted
  
  // Optional stacks
  cache: boolean;   // Redis/ElastiCache for caching
  sqs: boolean;     // SQS queues for async processing
  ecs: boolean;     // ECS/Fargate for background tasks
  ecr: boolean;     // Container registry (auto-enabled with ECS)
}

export interface ProjectConfig {
  // ═══════════════════════════════════════════════════════════════
  // CORE PROJECT SETTINGS
  // Users MUST update these when forking the template
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Project name used in stack IDs and resource names
   * Example: "TemplateProject" → "MyNewProject"
   * Convention: PascalCase, no spaces or special characters
   */
  projectName: string;
  
  /**
   * Lowercase slug used for S3 buckets and SSM parameters
   * Example: "templateproject" → "mynewproject"
   * Convention: lowercase, no spaces, hyphens allowed
   */
  projectSlug: string;
  
  /**
   * Human-readable display name for tags and descriptions
   * Example: "Template-Project" → "My New Project"
   */
  projectDisplayName: string;
  
  // ═══════════════════════════════════════════════════════════════
  // STACK DEPLOYMENT TOGGLES
  // ═══════════════════════════════════════════════════════════════
  
  stacks: StackToggles;
  
  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATION SETTINGS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Email address for CloudWatch alarm notifications
   */
  alertEmail?: string;
}

/**
 * Default configuration - CUSTOMIZE THESE VALUES WHEN FORKING
 */
export const defaultProjectConfig: ProjectConfig = {
  // ┌─────────────────────────────────────────────────────────────┐
  // │  CUSTOMIZE THESE VALUES FOR YOUR PROJECT                    │
  // └─────────────────────────────────────────────────────────────┘
  projectName: "EribertoLopez",
  projectSlug: "eribertolopez",
  projectDisplayName: "Eriberto-Lopez-Portfolio",
  
  stacks: {
    // Core stacks (always true)
    vpc: true,
    database: true,
    iam: true,
    lambda: true,
    monitoring: true,  // Core - Lambda/API GW alarms always deployed
    frontend: true,
    
    // Optional stacks - set to false to disable
    cache: false,       // Set false if you don't need Redis caching
    sqs: false,         // Set false if you don't need async queues
    ecs: false,         // Set false if you don't need background tasks
    ecr: false,         // Auto-enabled when ecs is true
  },
  
  alertEmail: "alerts@example.com",
};

/**
 * Load project configuration with environment variable overrides
 * Allows CI/CD to customize without code changes
 */
export function loadProjectConfig(): ProjectConfig {
  const config = JSON.parse(JSON.stringify(defaultProjectConfig)) as ProjectConfig;
  
  // Override core settings from environment
  if (process.env.PROJECT_NAME) config.projectName = process.env.PROJECT_NAME;
  if (process.env.PROJECT_SLUG) config.projectSlug = process.env.PROJECT_SLUG;
  if (process.env.PROJECT_DISPLAY_NAME) config.projectDisplayName = process.env.PROJECT_DISPLAY_NAME;
  if (process.env.ALERT_EMAIL) config.alertEmail = process.env.ALERT_EMAIL;
  
  // Override stack toggles from environment
  const boolEnv = (key: string): boolean | undefined => {
    const val = process.env[key];
    return val === undefined ? undefined : val === "true";
  };
  
  if (boolEnv("ENABLE_CACHE") !== undefined) config.stacks.cache = boolEnv("ENABLE_CACHE")!;
  if (boolEnv("ENABLE_SQS") !== undefined) config.stacks.sqs = boolEnv("ENABLE_SQS")!;
  if (boolEnv("ENABLE_ECS") !== undefined) config.stacks.ecs = boolEnv("ENABLE_ECS")!;
  if (boolEnv("ENABLE_ECR") !== undefined) config.stacks.ecr = boolEnv("ENABLE_ECR")!;
  // Note: ENABLE_MONITORING removed - monitoring is now a core stack
  
  // ECS requires ECR - auto-enable if needed
  if (config.stacks.ecs && !config.stacks.ecr) {
    console.log("Note: ECR stack auto-enabled because ECS is enabled");
    config.stacks.ecr = true;
  }
  
  return config;
}
