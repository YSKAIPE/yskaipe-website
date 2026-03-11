import VideoThumb from "@/public/images/hero-image-02.jpg";
import ModalVideo from "@/components/modal-video";

export default function HeroHome() {
  return (
    <section className="relative overflow-hidden">
      {/* Optional subtle background glow/orbs - comment out if not wanted */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 w-[800px] md:w-[1200px] aspect-square rounded-full bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="relative py-16 md:py-24 lg:py-32">
          {/* Hero content */}
          <div className="text-center">
            <h1
              className="animate-gradient-x bg-gradient-to-r from-gray-100 via-indigo-300 to-purple-200 bg-[length:200%_auto] bg-clip-text pb-5 font-nacelle text-5xl font-bold tracking-tight text-transparent md:text-6xl lg:text-7xl"
              data-aos="fade-up"
            >
              Human Cohesive AI
            </h1>

            <p
              className="mx-auto mt-6 max-w-2xl text-xl md:text-2xl text-indigo-100/80 font-light tracking-wide"
              data-aos="fade-up"
              data-aos-delay={150}
            >
              From <span className="font-semibold text-white">ONE PROMPT</span> →{" "}
              <span className="italic text-indigo-300">A TEAM THAT SHIPS</span>
            </p>

            <div
              className="mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-6"
              data-aos="fade-up"
              data-aos-delay={300}
            >
              {/* Primary button */}
              <a
                href="/prototype.html"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-b from-indigo-600 to-indigo-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.03] hover:shadow-indigo-600/40 active:scale-[0.98] sm:px-10 sm:py-5 sm:text-lg"
              >
                <span className="relative z-10">Figma Prototype</span>
                <span className="relative z-10 translate-x-0.5 text-white/70 transition-transform group-hover:translate-x-1.5">
                  →
                </span>
                <div className="absolute inset-0 scale-x-0 bg-gradient-to-r from-indigo-400/30 to-transparent transition-transform group-hover:scale-x-100 group-hover:origin-left" />
              </a>

              {/* Secondary button - glass effect */}
              <a
                href="/waitlist.html"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-indigo-100 backdrop-blur-lg transition-all duration-300 hover:bg-white/10 hover:text-white hover:shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98] sm:px-10 sm:py-5 sm:text-lg"
              >
                <span className="relative z-10">Join the Waitlist</span>
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-purple-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </div>
          </div>

          {/* Video thumbnail – centered, slightly larger, with nice border glow */}
          <div
            className="relative mx-auto mt-16 max-w-5xl px-4 sm:mt-20 lg:mt-24"
            data-aos="fade-up"
            data-aos-delay={500}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/10">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 z-10 pointer-events-none" />
              <ModalVideo
                thumb={VideoThumb}
                thumbWidth={1104}
                thumbHeight={576}
                thumbAlt="Human Cohesive AI – see it in action"
                video="videos/video.mp4"
                videoWidth={1920}
                videoHeight={1080}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
