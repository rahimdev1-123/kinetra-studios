import { TimelineScrubber } from "@/components/kinetra/timeline-scrubber";
import { Hero } from "@/components/kinetra/hero";
import { Portfolio } from "@/components/kinetra/portfolio";
import { Services } from "@/components/kinetra/services";
import { About } from "@/components/kinetra/about";
import { Testimonials } from "@/components/kinetra/testimonials";
import { Process } from "@/components/kinetra/process";
import { Contact } from "@/components/kinetra/contact";
import { Footer } from "@/components/kinetra/footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Signature: fixed timeline scrubber + nav (the top letterbox) */}
      <TimelineScrubber />

      <main className="flex-1">
        <Hero />
        <Portfolio />
        <Services />
        <About />
        <Testimonials />
        <Process />
        <Contact />
      </main>

      <Footer />
    </div>
  );
}
