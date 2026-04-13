const terms = [
  {
    title: 'Product nature',
    body: 'Forge8004 is an operator-facing software product for autonomous agent workflows, trade-intent visibility, sandbox execution, and trust-oriented telemetry. It does not guarantee profits or safe market outcomes.'
  },
  {
    title: 'No financial advice',
    body: 'Nothing in the application, AI engine output, validation score, or product content should be treated as financial, legal, compliance, or investment advice.'
  },
  {
    title: 'Operator responsibility',
    body: 'You are responsible for how you use the product, what accounts or wallets you connect, and whether you rely on sandbox or live execution flows in your own environment.'
  },
  {
    title: 'Service availability',
    body: 'Features may change, pause, degrade, or fall back to safer modes when infrastructure, network access, model quotas, or external services are unavailable.'
  },
  {
    title: 'Risk disclosures',
    body: 'Digital asset markets are volatile. Even with router controls, trust scores, and validation artifacts, losses and technical failures remain possible.'
  },
  {
    title: 'Acceptable use',
    body: 'You agree not to misuse the product, bypass safety features, impersonate other operators, or use Forge8004 in ways that violate law, platform rules, or third-party provider requirements.'
  }
];

export default function TermsConditions() {
  return (
    <div className="page-shell-narrow">
      <section className="page-header">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-cyber">Legal</p>
          <h1 className="mt-3 text-3xl font-mono font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
            Terms and Conditions
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            These terms describe the main conditions for using the Forge8004 product, operator workspace, and related trust-oriented features.
          </p>
        </div>
      </section>

      <section className="glass-panel p-6 sm:p-8 lg:p-10 space-y-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-600">Last updated: March 26, 2026</p>
        {terms.map((term) => (
          <div key={term.title} className="border-t border-border-subtle pt-5 first:border-t-0 first:pt-0">
            <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-white">{term.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{term.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
