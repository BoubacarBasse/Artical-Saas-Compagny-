import Link from "next/link";
import { LinkButton } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Describe it once",
    body: "Title, brief, keywords, format and word count. Save it and a writer picks it up.",
  },
  {
    title: "Follow it through production",
    body: "A status badge and a real history — not a percentage that means nothing.",
  },
  {
    title: "Download when it's ready",
    body: "You get a signed link the moment the piece is delivered. Nothing to chase.",
  },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[13px] font-semibold text-accent-fg">
            A
          </span>
          <span className="text-sm font-semibold tracking-tight">Article Orders</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md px-3.5 py-2 text-[13.5px] font-medium text-fg hover:bg-surface-hover"
          >
            Sign in
          </Link>
          <LinkButton href="/signup">Sign up</LinkButton>
        </nav>
      </header>

      <main className="mx-auto max-w-[720px] px-6 pt-16 pb-24 text-center">
        <h1 className="mx-auto mb-4 max-w-[560px] text-4xl leading-[1.15] font-semibold tracking-tight text-wrap-balance">
          Order articles. Watch them move through production.
        </h1>
        <p className="mx-auto mb-8 max-w-[440px] text-[15px] text-fg-subtle">
          A client dashboard for a content-writing business — submit a brief, follow the status,
          download the finished piece.
        </p>
        <div className="flex items-center justify-center gap-3">
          <LinkButton href="/signup" className="px-5 py-3 text-sm">
            Get started
          </LinkButton>
          <LinkButton href="/login" variant="secondary" className="px-5 py-3 text-sm">
            Sign in
          </LinkButton>
        </div>
      </main>

      <section className="border-t border-border-subtle bg-surface">
        <div className="mx-auto grid max-w-[1080px] grid-cols-3 gap-6 px-6 py-14">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <h2 className="mb-1.5 text-[15px] font-semibold">{f.title}</h2>
              <p className="text-[13.5px] text-fg-subtle">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-fg-faint">
        Article Orders
      </footer>
    </div>
  );
}
