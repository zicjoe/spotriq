import type { ExploreCategory, Route } from "../domain/types";
import { BRAND } from "./brand";

export const FOOTER_CONFIG = {
  product: {
    name: BRAND.name,
    descriptor: BRAND.descriptor,
    tagline: BRAND.description,
    secondaryLine: BRAND.tagline,
    ecosystemNote: "Built for BNB Smart Chain",
  },
  nav: {
    product: [
      { label: "Home", route: "home" as Route },
      { label: "Explore Agents", route: "explore" as Route },
      { label: "Smart Money Check", route: "check" as Route },
      { label: "Smart Money Plans", route: "plans" as Route },
      { label: "My Agents", route: "my-agents" as Route },
    ],
    explore: [
      { label: "Rebalancing", route: "explore" as Route, category: "rebalancing" as ExploreCategory },
      { label: "Grid Trading", route: "explore" as Route, category: "grid" as ExploreCategory },
      { label: "Yield Optimisation", route: "explore" as Route, category: "yield" as ExploreCategory },
      { label: "Health Factor Monitoring", route: "explore" as Route, category: "health" as ExploreCategory },
    ],
    resources: [
      { label: "Architecture & BNB", route: "launch" as Route },
      { label: "How Evidence Works", route: null },
      { label: "Marketplace Tests", route: null },
      { label: "Agent Authority", route: "my-agents" as Route, tab: "authority" as const },
      { label: "Supported Protocols", route: null },
      { label: "For Agent Operators", route: "operator" as Route },
    ],
    operator: [
      { label: "List an Agent", route: "operator" as Route },
      { label: "Operator Workspace", route: "operator" as Route },
    ],
  },
  legal: {
    copyrightName: BRAND.name,
    links: [
      { label: "Terms", route: null },
      { label: "Privacy", route: null },
      { label: "Risk Disclosure", route: null },
      { label: "System Status", route: null },
    ],
    disclaimer:
      "Marketplace information and agent performance data are provided for evaluation purposes and may include observed, calculated, external, or operator-supplied information. Rates and past performance do not guarantee future results. Users remain responsible for reviewing agent permissions and financial risk before activation.",
    ecosystemAttribution:
      "Supporting BSC financial agents and compatible BNB ecosystem infrastructure.",
  },
} as const;
