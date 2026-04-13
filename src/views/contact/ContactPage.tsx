import { ArrowUpRight, Mail, MessageSquareText, ShieldQuestion, UserRound } from 'lucide-react';

const contactChannels = [
  {
    title: 'General inquiries',
    value: 'hello@forge8004.ai',
    hint: 'Product questions, partnerships, and demo requests.',
    icon: Mail
  },
  {
    title: 'Security and trust',
    value: 'trust@forge8004.ai',
    hint: 'Responsible disclosure, policy questions, and operator safety concerns.',
    icon: ShieldQuestion
  },
  {
    title: 'Operator onboarding',
    value: 'ops@forge8004.ai',
    hint: 'Getting your first agent registered and ready for evaluation.',
    icon: UserRound
  }
];

const faqs = [
  {
    question: 'Is Forge8004 already executing real capital?',
    answer: 'Today the product is designed around sandbox capital, routed policy checks, and trust-oriented operator visibility. It is built to grow toward more production-grade execution.'
  },
  {
    question: 'Can teams use this for a demo or pilot?',
    answer: 'Yes. The current experience is especially strong for showing a credible trust story around autonomous financial agents.'
  },
  {
    question: 'Do I need a wallet to use the product?',
    answer: 'You can still sign in, register, and inspect agents without a live wallet, but wallet connection is needed for the signed-trade flow.'
  }
];

export default function ContactPage() {
  return (
    <div className="page-shell">
      <section className="page-header">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-cyber">Contact</p>
          <h1 className="mt-3 text-3xl font-mono font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
            Talk to the
            <span className="block text-emerald-cyber">Forge8004 team</span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Whether you are building a trustless agent, preparing a demo, or evaluating how Forge8004 fits your workflow, this is the fastest way to reach the right channel.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {contactChannels.map((channel) => (
          <a
            key={channel.title}
            href={`mailto:${channel.value}`}
            className="glass-panel group p-6 sm:p-8 transition-colors hover:border-emerald-cyber/30"
          >
            <div className="flex items-center justify-between gap-4">
              <channel.icon className="h-5 w-5 text-emerald-cyber" />
              <ArrowUpRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-emerald-cyber" />
            </div>
            <h2 className="mt-6 text-xl font-mono font-bold uppercase tracking-tight text-white">
              {channel.title}
            </h2>
            <p className="mt-4 break-all text-sm text-emerald-cyber">{channel.value}</p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">{channel.hint}</p>
          </a>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <div className="glass-panel p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-5 w-5 text-emerald-cyber" />
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white">
              Suggested inquiry format
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-zinc-400">
            <p>To help the team reply faster, include:</p>
            <div className="space-y-3">
              {[
                'What you are building or evaluating',
                'Which page or flow you are asking about',
                'Whether the request is for product, trust, or operator support',
                'Any screenshots or reproduction steps if you are reporting a bug'
              ].map((item) => (
                <div key={item} className="border border-border-subtle bg-obsidian/40 px-4 py-4">
                  <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-8 space-y-5">
          <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white">
            Quick answers
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="border border-border-subtle bg-obsidian/40 p-5">
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-white">
                  {faq.question}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
