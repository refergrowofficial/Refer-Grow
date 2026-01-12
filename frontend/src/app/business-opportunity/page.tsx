import BusinessOpportunityForm from "./BusinessOpportunityForm";

export default function BusinessOpportunityPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Business Opportunity</h1>
      <div className="mt-4 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
        <p>
          Income is calculated from Business Volume (BV). Each service has a BV value, and repurchases
          add BV again.
        </p>
        <p>
          Level-wise commission is distributed as a decreasing percentage of BV:
        </p>
        <ul className="list-disc pl-5">
          <li>Level 1: 10% of BV</li>
          <li>Level 2: 5% of BV</li>
          <li>Level 3: 2.5% of BV</li>
          <li>Level 4: 1.25% of BV</li>
          <li>Level 5: 50% of Level 4</li>
          <li>Level 6+: Half of the previous level</li>
        </ul>
      </div>

      <BusinessOpportunityForm />
    </div>
  );
}
