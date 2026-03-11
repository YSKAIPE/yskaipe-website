import VideoThumb from "@/public/images/hero-image-02.jpg";
import ModalVideo from "@/components/modal-video";

export default function HeroHome() {
  return (
    <section className="relative overflow-hidden">
      {/* Atmospheric background orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-violet-500/15 blur-[100px] animate-[pulse_10s_ease-in-out_2s_infinite]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-400/10 blur-[80px] animate-[pulse_12s_ease-in-out_4s_infinite]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-16 md:py-24">

          {/* Badge */}
          <div className="mb-6 flex justify-center" data-aos="fade-down">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium tracking-widest text-indigo-300 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Now in Early Access
            </span>
          </div>

          {/* Headline */}
          <div className="pb-10 text-center md:pb-16">
            <h1
              className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-4 font-nacelle text-5xl font-semibold text-transparent md:text-6xl lg:text-7xl leading-[1.1] tracking-tight"
              data-aos="fade-up"
            >
              Human Cohesive
              <br />
              <span className="relative">
                AI
                {/* Subtle underline glow */}
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
              </span>
            </h1>

            <div className="mx-auto max-w-2xl">
              <p
                className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-400/80"
                data-aos="fade-up"
                data-aos-delay={150}
              >
                From ONE PROMPT
              </p>
              <p
                className="mb-10 text-2xl font-light text-gray-300/80 md:text-3xl"
                data-aos="fade-up"
                data-aos-delay={200}
              >
                to a{" "}
                <span className="font-semibold text-white">team that ships</span>
              </p>

              {/* CTA Buttons */}
              <div
                className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
                data-aos="fade-up"
                data-aos-delay={400}
              >
                
                  className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-indigo-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                  href="/prototype.html"
                >
                  <span className="relative flex items-center gap-2">
                    <svg className="h-4 w-4 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                    </svg>
                    View Figma Prototype
                    <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                  </span>
                  {/* Shimmer effect */}
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </a>

                
                  className="group inline-flex h-12 items-center justify-center rounded-xl border border-gray-700/80 bg-gray-900/60 px-8 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all duration-300 hover:border-gray-600 hover:bg-gray-800/80 hover:text-white hover:-translate-y-0.5 active:translate-y-0"
                  href="/waitlist.html"
                >
                  Join the Waitlist
                  <span className="ml-2 text-gray-500 transition-all duration-300 group-hover:text-gray-300 group-hover:ml-3">→</span>
                </a>
              </div>

              {/* Social proof whisper */}
              <p
                className="mt-6 text-xs text-gray-600"
                data-aos="fade-up"
                data-aos-delay={600}
              >
                HUMAN COHESIVE AI · No credit card required
              </p>
            </div>
          </div>

          {/* Video */}
          <div data-aos="fade-up" data-aos-delay={300} className="relative">
            {/* Glow ring behind video */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-violet-500/10 to-indigo-500/20 blur-xl" />
            <ModalVideo
              thumb={VideoThumb}
              thumbWidth={1104}
              thumbHeight={576}
              thumbAlt="Modal video thumbnail"
              video="videos//video.mp4"
              videoWidth={1920}
              videoHeight={1080}
            />
          </div>

        </div>
      </div>
    </section>
  );
}
