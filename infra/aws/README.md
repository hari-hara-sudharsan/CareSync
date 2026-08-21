# ☁️ CareSync AWS Infrastructure-as-Code (CDK TypeScript)

This directory contains the AWS CDK TypeScript foundation for CareSync (`caresync`).

> **Phase 12A Architectural Guardrail**: In Phase 12A, no expensive runtime resources (VPC, NAT Gateway, RDS, ElastiCache, ECS, ALB, Bedrock workloads) are created. This stack contains metadata, environment definitions, tag inheritance, and cost guardrails.

---

## 🛠️ Prerequisites

1. Node.js 18+ and `npm`
2. AWS CLI v1 or v2 (`aws --version`)
3. AWS credentials configured locally (`aws configure`) or via temporary IAM session roles
4. Environment setting `AWS_REGION` (Default: `ap-south-1` Mumbai)

---

## 📂 Directory Structure

```text
infra/aws/
├── README.md                 # Infrastructure documentation
├── cdk.json                  # CDK app execution configuration
├── package.json              # Dependencies & build scripts
├── tsconfig.json             # TypeScript compiler settings
├── bin/
│   └── caresync.ts           # CDK App Entrypoint
├── config/
│   └── environments.ts       # Environment, tags, & region configuration
└── lib/
    └── caresync-stack.ts     # CareSync CDK Stack Definition
```

---

## 🚀 Usage & Validation Commands

### 1. Install Dependencies
```bash
cd infra/aws
npm install
```

### 2. Compile TypeScript
```bash
npm run build
```

### 3. Synthesize CloudFormation Template
```bash
npx cdk synth
```

---

## 🏷️ Standard Tagging Strategy

All resources synthesized by this CDK stack automatically inherit standard hackathon tags:

- `Project`: `CareSync`
- `Environment`: `demo` (or `dev`/`staging`/`prod`)
- `Owner`: `CareSync`
- `ManagedBy`: `IaC`
- `Purpose`: `Hackathon`
- `CostCenter`: `CareSyncDemo`

---

## 🔒 Security & Secret Protection

1. **Zero Hardcoded Secrets**: Credentials must never be committed to Git.
2. **Environment Isolation**: Stack names follow `${projectName}-${environment}-stack` (e.g. `caresync-demo-stack`).
3. **No NAT Gateways**: Future networking phases will use public/private subnet routing without costly $32/mo NAT Gateways.
