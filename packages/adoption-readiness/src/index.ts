export type AdoptionIntegrationState = "LIVE" | "NORMALIZED" | "RECONCILIATION_ONLY" | "TESTNET_ONLY";

export interface AdoptionIntegration {
  code: "BSC" | "ERC8004" | "BNB_AGENT_STUDIO" | "ERC8183" | "X402_B402" | "PANCAKESWAP" | "VENUS";
  label: string;
  state: AdoptionIntegrationState;
  role: string;
  boundary: string;
  officialReference?: string;
}

export interface PublicAdoptionManifest {
  schemaVersion: "spotriq.public-adoption@1.0.0";
  release: {
    version: string;
    status: "PUBLIC_LAUNCH_CANDIDATE" | "ADOPTION_MEASUREMENT_CANDIDATE" | "ADOPTION_MEASUREMENT_ACTIVE";
    acceptedThrough: string;
  };
  product: {
    name: "Spotriq";
    descriptor: "BSC financial-agent marketplace";
    tagline: "Know what your money needs. Spot the right agent for it.";
    lifecycle: string;
    categories: readonly ["Rebalancing", "Grid Trading", "Yield Optimisation", "Health Factor Monitoring"];
  };
  networks: {
    discovery: { network: "BSC Mainnet"; chainId: 56; purpose: "ERC-8004 marketplace discovery" };
    readOnlyObservation: { network: "BSC Mainnet"; chainId: 56; purpose: "real Smart Money and supported reference-agent read-only observation" };
    transactionalDevelopment: { network: "BSC Testnet"; chainId: 97; purpose: "authority/execution development and testnet observation" };
    bscMainnetFinancialExecutionApproved: false;
  };
  integrations: AdoptionIntegration[];
  truthBoundaries: string[];
  publicProof: {
    apiHealthPath: "/health";
    capabilitiesPath: "/v1/system/capabilities";
    systemHealthPath: "/v1/system/health";
    adoptionManifestPath: "/v1/public/adoption";
    adoptionAnalyticsAdminPath?: "/v1/admin/adoption-analytics";
    referenceAgentsPath: "/v1/reference-agents";
  };
  launchPackage: {
    architectureDoc: "docs/public/ARCHITECTURE_AND_TRUST_BOUNDARIES.md";
    bnbIntegrationDoc: "docs/public/BNB_ECOSYSTEM_INTEGRATION.md";
    demoPlaybook: "docs/public/DEMO_PLAYBOOK.md";
    adoptionEvidence: "docs/public/ADOPTION_EVIDENCE.md";
    securityBrief: "docs/public/SECURITY_AND_OPERATIONS.md";
    screenshotChecklist: "docs/public/SCREENSHOT_EVIDENCE_CHECKLIST.md";
    submissionChecklist: "docs/public/SUBMISSION_CHECKLIST.md";
  };
  readiness: {
    publicDocsComplete: true;
    machineReadableAdoptionManifest: true;
    liveAcceptanceVerifierIncluded: true;
    evidenceCaptureScriptIncluded: true;
    productionAdoptionAnalyticsEnabled?: true;
    mainnetFinancialExecutionApproved: false;
    unresolvedExternalItems: string[];
  };
}

const OFFICIAL = {
  bnbAgentSdk: "https://docs.bnbchain.org/developer-kit/bnbagent-sdk/quickstart-typescript/",
  agentStudio: "https://docs.bnbchain.org/developer-kit/bnbchain-studio/quickstart/",
  agentStudioCli: "https://docs.bnbchain.org/developer-kit/bnbchain-studio/cli-reference/",
  x402: "https://docs.cdp.coinbase.com/x402/welcome",
} as const;

export function buildPublicAdoptionManifest(): PublicAdoptionManifest {
  return {
    schemaVersion: "spotriq.public-adoption@1.0.0",
    release: { version: "0.39.0", status: "ADOPTION_MEASUREMENT_ACTIVE", acceptedThrough: "0.39.0" },
    product: {
      name: "Spotriq",
      descriptor: "BSC financial-agent marketplace",
      tagline: "Know what your money needs. Spot the right agent for it.",
      lifecycle: "Understand → Discover → Match → Evaluate → Quote → Hire → Activate → Permission → Execute → Monitor → Measure → Explain → Continue / Switch / Combine / Revoke",
      categories: ["Rebalancing", "Grid Trading", "Yield Optimisation", "Health Factor Monitoring"],
    },
    networks: {
      discovery: { network: "BSC Mainnet", chainId: 56, purpose: "ERC-8004 marketplace discovery" },
      readOnlyObservation: { network: "BSC Mainnet", chainId: 56, purpose: "real Smart Money and supported reference-agent read-only observation" },
      transactionalDevelopment: { network: "BSC Testnet", chainId: 97, purpose: "authority/execution development and testnet observation" },
      bscMainnetFinancialExecutionApproved: false,
    },
    integrations: [
      { code: "BSC", label: "BNB Smart Chain", state: "LIVE", role: "Canonical chain/evidence substrate for Mainnet discovery/read-only financial observation and Testnet authority/execution development.", boundary: "BSC Mainnet read-only observation is explicitly separate from BSC Mainnet financial execution, which remains unapproved." },
      { code: "ERC8004", label: "ERC-8004 identity", state: "LIVE", role: "Canonical agent identity discovery and owner verification.", boundary: "Registry identity is not Marketplace readiness, commercial state, PermissionGrant, execution or outcome.", officialReference: OFFICIAL.bnbAgentSdk },
      { code: "BNB_AGENT_STUDIO", label: "BNB Agent Studio", state: "NORMALIZED", role: "Operator-declared deployment posture reconciled against canonical identity, A2A registration and Test Lab evidence.", boundary: "Studio deployment does not override identity/readiness/payment/permission/execution/outcome and Spotriq does not run the Studio CLI or ingest Studio wallet secrets.", officialReference: OFFICIAL.agentStudioCli },
      { code: "ERC8183", label: "ERC-8183 commerce", state: "RECONCILIATION_ONLY", role: "Provider-neutral paid-commercial adapter observes job/escrow state.", boundary: "Commerce/payment remains distinct from Hire, Activation, PermissionGrant and financial execution.", officialReference: OFFICIAL.bnbAgentSdk },
      { code: "X402_B402", label: "x402 / B402", state: "RECONCILIATION_ONLY", role: "Canonical settlement evidence can satisfy immutable Quote terms after independent chain reconciliation.", boundary: "Browser/facilitator paid assertions never become payment truth; Spotriq payment signing/dispatch remains disabled.", officialReference: OFFICIAL.x402 },
      { code: "PANCAKESWAP", label: "PancakeSwap", state: "LIVE", role: "Concentrated-liquidity, grid-market context and guarded financial execution substrate.", boundary: "Prepared calldata or technical success never becomes financial performance." },
      { code: "VENUS", label: "Venus", state: "LIVE", role: "Lending health and supported yield opportunity data substrate.", boundary: "Current rates/health observations never become realised yield or autonomous protection authority." },
    ],
    truthBoundaries: [
      "AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer",
      "Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation",
      "Permission ≠ Activation ≠ Execution",
      "Transaction ≠ Outcome ≠ Agent Advantage",
      "Evidence ≠ AI explanation",
      "Operational health ≠ marketplace readiness/trust",
      "Agent Studio deployment ≠ canonical identity ≠ readiness ≠ payment ≠ permission ≠ execution",
      "Production scalability ≠ BSC Mainnet financial execution approval",
      "AI explains. Deterministic systems decide.",
    ],
    publicProof: {
      apiHealthPath: "/health",
      capabilitiesPath: "/v1/system/capabilities",
      systemHealthPath: "/v1/system/health",
      adoptionManifestPath: "/v1/public/adoption",
      adoptionAnalyticsAdminPath: "/v1/admin/adoption-analytics",
      referenceAgentsPath: "/v1/reference-agents",
    },
    launchPackage: {
      architectureDoc: "docs/public/ARCHITECTURE_AND_TRUST_BOUNDARIES.md",
      bnbIntegrationDoc: "docs/public/BNB_ECOSYSTEM_INTEGRATION.md",
      demoPlaybook: "docs/public/DEMO_PLAYBOOK.md",
      adoptionEvidence: "docs/public/ADOPTION_EVIDENCE.md",
      securityBrief: "docs/public/SECURITY_AND_OPERATIONS.md",
      screenshotChecklist: "docs/public/SCREENSHOT_EVIDENCE_CHECKLIST.md",
      submissionChecklist: "docs/public/SUBMISSION_CHECKLIST.md",
    },
    readiness: {
      publicDocsComplete: true,
      machineReadableAdoptionManifest: true,
      liveAcceptanceVerifierIncluded: true,
      evidenceCaptureScriptIncluded: true,
      productionAdoptionAnalyticsEnabled: true,
      mainnetFinancialExecutionApproved: false,
      unresolvedExternalItems: [
        "Capture/refresh current production screenshots after v0.39 deployment.",
        "Record final public demo video and submission URLs outside the repository.",
        "BSC Mainnet financial execution requires separate explicit approval and readiness review.",
      ],
    },
  };
}
