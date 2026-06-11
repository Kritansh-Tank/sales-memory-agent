import { MemoryClient } from "@xtraceai/memory";

let client: MemoryClient | null = null;

export function getMemoryClient(): MemoryClient {
  if (!client) {
    client = new MemoryClient({
      apiKey: process.env.XTRACE_API_KEY!,
      orgId: process.env.XTRACE_ORG_ID!,
    });
  }
  return client;
}

// Pre-seeded demo accounts
export const DEMO_ACCOUNTS = [
  {
    id: "grp_acme_corp",
    name: "Acme Corp",
    industry: "SaaS Logistics",
    stage: "Negotiation",
    health: 85,
    value: "$120K ARR",
    champion: "Sarah Chen",
    color: "#7c3aed",
    seedData: [
      "Call with Sarah Chen (VP Engineering) on May 12. She confirmed budget of $120K approved by CFO. Main pain point is their current vector DB has 800ms P99 latency during peak loads. She wants sub-200ms.",
      "Technical discovery session on May 20. Their stack is AWS-based, using Pinecone currently. Two blockers: (1) security review needed for data residency, (2) need to benchmark our latency vs Pinecone. Sarah is our champion, reports to CTO David Kim.",
      "Email from Sarah on June 1: Legal review is 90% done. She shared that Globex Ltd is also evaluating us. Competitive intel: Acme tried Weaviate 6 months ago but dropped it due to poor support. Our differentiator should be support SLAs + latency.",
      "Demo session on June 5 with Sarah + 2 engineers. Very positive reaction to real-time memory extraction. Engineer Jake asked about multi-tenant isolation. Need to send technical whitepaper. Sarah wants to close by June 30.",
    ],
  },
  {
    id: "grp_techflow_inc",
    name: "TechFlow Inc",
    industry: "Fintech",
    stage: "Legal Review",
    health: 65,
    value: "$85K ARR",
    champion: "Marcus Reid",
    color: "#0891b2",
    seedData: [
      "Initial call on April 30 with Marcus Reid (Head of AI). TechFlow is building a customer support AI that needs persistent memory across sessions. Current approach is storing raw transcripts in Postgres - not scalable.",
      "Technical POC completed May 15. Marcus ran our SDK against their production load - 95th percentile latency was 145ms. He was impressed. Said this is 5x better than their home-built solution.",
      "May 28: CFO approved budget. Legal team reviewing DPA (Data Processing Agreement). Main concern is GDPR compliance since they have EU customers. Sent our DPA template. Legal review expected to take 2-3 weeks.",
      "June 3: Marcus pinged - legal has one question about data retention policies. Need to loop in our legal team. Marcus wants to sign by end of June to hit Q3 launch of their AI product.",
    ],
  },
  {
    id: "grp_globex_ltd",
    name: "Globex Ltd",
    industry: "Enterprise Software",
    stage: "Evaluation",
    health: 45,
    value: "$200K ARR",
    champion: "Jennifer Walsh",
    color: "#059669",
    seedData: [
      "First contact May 5 with Jennifer Walsh (Director of Engineering). Globex is evaluating 3 vendors: us, Mem0, and a home-built solution. Timeline is 8 weeks for decision. Deal size is $200K ARR if we win.",
      "May 19: RFP received. 47 questions covering security, scalability, and API design. Key requirements: SOC2 Type II (we have it), 99.99% uptime SLA, multi-region deployment, max 100ms latency. Sent RFP response June 2.",
      "June 4: Jennifer shared that our latency benchmark (82ms P99) beat both competitors. Mem0 got 230ms, home-built was 500ms+. Our main risk is price - we're 30% more expensive. Jennifer needs ammunition for budget committee on June 20.",
      "Competing on: latency (we win), support (we win), price (we lose). Need to emphasize TCO - their home-built solution has 2 FTE maintaining it at ~$300K/year fully loaded.",
    ],
  },
];
