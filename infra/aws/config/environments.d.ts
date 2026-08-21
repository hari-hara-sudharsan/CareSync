import { Construct } from 'constructs';
export interface EnvironmentConfig {
    projectName: string;
    environment: 'demo' | 'dev' | 'staging' | 'prod';
    region: string;
    monthlyBudgetUSD: number;
    tags: Record<string, string>;
}
export declare const getEnvironmentConfig: () => EnvironmentConfig;
export declare const applyStandardTags: (scope: Construct, tags: Record<string, string>) => void;
