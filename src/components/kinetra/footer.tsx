import { SOCIALS, FOOTER } from "@/lib/site-data";

/**
 * Footer — closes the reel metaphor with an `END 02:14` marker.
 * Sticks to the bottom (page wrapper uses flex-col + mt-auto).
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-shadow">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* brand */}
          <div>
            <div className="kin-display text-2xl tracking-[0.18em] text-print">
              {FOOTER.brand}
            </div>
            <p className="mt-2 max-w-xs text-sm text-ash">
              Cinematic, story-driven editing for personal brands and creators.
            </p>
          </div>

          {/* socials */}
          <div>
            <p className="kin-mono text-[11px] uppercase tracking-[0.12em] text-ash">
              Follow
            </p>
            <ul className="mt-3 space-y-1.5">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-print/80 transition-colors hover:text-highlight"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* email */}
          <div>
            <p className="kin-mono text-[11px] uppercase tracking-[0.12em] text-ash">
              Email
            </p>
            <p className="mt-3 text-sm text-highlight">{FOOTER.email}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="kin-mono text-[10px] uppercase tracking-[0.12em] text-ash">
            {FOOTER.copyright}
          </p>
          <p className="kin-mono text-[10px] uppercase tracking-[0.2em] text-highlight">
            {FOOTER.endMarker}
          </p>
        </div>
      </div>
    </footer>
  );
}
