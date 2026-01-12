export function getBusinessOpportunityEmailContent() {
  const subject = "Business Opportunity — BV & Level Income";

  const text = [
    "Business Opportunity",
    "",
    "Overview",
    "- The platform is open for anyone to join.",
    "- Users purchase services. Each service has a Business Volume (BV).",
    "- Income is calculated from BV (repurchases add BV again).",
    "",
    "Level-wise commission (based on BV)",
    "- Level 1: 10% of BV",
    "- Level 2: 5% of BV",
    "- Level 3: 2.5% of BV",
    "- Level 4: 1.25% of BV",
    "- Level 5: 50% of Level 4",
    "- Level 6+: Half of the previous level (keeps decreasing)",
    "",
    "Notes",
    "- Depth is unlimited; the percentage keeps halving.",
    "- Admin controls service price and BV values; changes apply to future purchases.",
  ].join("\n");

  return { subject, text };
}
