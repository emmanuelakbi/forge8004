const sections = [
  {
    title: 'Information we collect',
    body: 'We may process account details, operator profile information, agent metadata, wallet addresses, trade intent records, validation artifacts, and runtime telemetry needed to operate the Forge8004 workspace.'
  },
  {
    title: 'How the information is used',
    body: 'Data is used to authenticate operators, scope workspace visibility, render agent state, enforce product controls, improve safety, and support trust-oriented product features such as reputation and validation history.'
  },
  {
    title: 'Wallet and blockchain data',
    body: 'Wallet addresses, chain IDs, and signed-intent metadata can be stored or displayed where needed for the agent workflow. Public blockchain data may remain publicly visible outside the application.'
  },
  {
    title: 'Data sharing',
    body: 'Forge8004 does not sell operator data. Information may be processed by infrastructure providers needed to run authentication, database storage, analytics, and AI-assisted product functions.'
  },
  {
    title: 'Retention and deletion',
    body: 'Agent telemetry, validation logs, and operator-linked workspace records may be retained to preserve trust history and auditability unless deletion is required by product policy or applicable law.'
  },
  {
    title: 'Your choices',
    body: 'Operators can manage account access, disconnect wallets, and request support for workspace or trust-data questions through the contact channels listed in the product.'
  }
];

export default function PrivacyPolicy() {
  return (
    <div className="page-shell-narrow">
      <section className="page-header">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-cyber">Legal</p>
          <h1 className="mt-3 text-3xl font-mono font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            This page explains, at a product level, how Forge8004 handles operator, agent, wallet, and trust-related data.
          </p>
        </div>
      </section>

      <section className="glass-panel p-6 sm:p-8 lg:p-10 space-y-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-600">Last updated: March 26, 2026</p>
        {sections.map((section) => (
          <div key={section.title} className="border-t border-border-subtle pt-5 first:border-t-0 first:pt-0">
            <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-white">{section.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{section.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
