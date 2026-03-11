import VideoThumb from "@/public/images/hero-image-02.jpg";
import ModalVideo from "@/components/modal-video";

export default function HeroHome() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated background grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-indigo-900) 1px, transparent 1px), linear-gradient(90deg, var(--color-indigo-900) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />

      {/* Radial glow orbs */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--color-indigo-500) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/4 top-1/3 -z-10 h-[300px] w-[300px] -translate-x-1/2 rounded-full opacity-15"
        style={{
          background: "radial-gradient(ellipse at center, #818cf8 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "pulse 6s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-120px) translateX(20px); opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.04); opacity: 0.15; }
          100% { transform: scale(1); opacity: 0.4; }
        }
        .particle {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #a5b4fc;
          animation: float-particle 5s ease-in-out infinite;
          pointer-events: none;
        }
        .video-glow-ring {
          animation: pulse-ring 3s ease-in-out infinite;
        }
        .btn-primary-snazzy {
          position: relative;
          overflow: hidden;
        }
        .btn-primary-snazzy::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .btn-primary-snazzy:hover::before {
          transform: translateX(100%);
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero content */}
        <div className="py-12 md:py-20">
          {/* Section header */}
          <div className="pb-12 text-center md:pb-20">
            {/* Floating particles */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="particle"
                  style={{
                    left: `${10 + i * 11}%`,
                    top: `${30 + (i % 3) * 15}%`,
                    animationDelay: `${i * 0.7}s`,
                    animationDuration: `${4 + i * 0.5}s`,
                  }}
                />
              ))}
            </div>

            <h1
              className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-5 font-nacelle text-4xl font-semibold text-transparent md:text-5xl"
              data-aos="fade-up"
              style={{ letterSpacing: "-0.02em", textShadow: "0 0 80px rgba(165,180,252,0.15)" }}
            >
              Human Cohesive AI
            </h1>

            <div className="mx-auto max-w-3xl">
              <p
                className="mb-8 text-xl text-indigo-200/65"
                data-aos="fade-up"
                data-aos-delay={200}
                style={{ letterSpacing: "0.01em" }}
              >
                From{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg, #c7d2fe, #a5b4fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 600,
                  }}
                >
                  ONE PROMPT
                </span>{" "}
                to{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg, #a5b4fc, #818cf8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 600,
                  }}
                >
                  A TEAM THAT SHIPS
                </span>
              </p>

              <div className="mx-auto max-w-xs sm:flex sm:max-w-none sm:justify-center">
                <div data-aos="fade-up" data-aos-delay={400}>
                  
                    className="btn-primary-snazzy btn group mb-4 w-full bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%] sm:mb-0 sm:w-auto"
                    href="/prototype.html"
                    style={{ boxShadow: "0 0 24px rgba(99,102,241,0.35), inset 0px 1px 0px 0px rgba(255,255,255,0.16)" }}
                  >
                    <span className="relative inline-flex items-center">
                      Figma PROTOTYPE
                      <span className="ml-1 tracking-normal text-white/50 transition-transform group-hover:translate-x-0.5">
                        -&gt;
                      </span>
                    </span>
                  </a>
                </div>

                <div data-aos="fade-up" data-aos-delay={600}>
                  
                    className="btn relative w-full bg-linear-to-b from-gray-800 to-gray-800/60 bg-[length:100%_100%] bg-[bottom] text-gray-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] hover:bg-[length:100%_150%] sm:ml-4 sm:w-auto"
                    href="/waitlist.html"
                    style={{ transition: "box-shadow 0.3s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 16px rgba(148,163,184,0.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                  >
                    Join the Waitlist
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Video with glow ring */}
          <div className="relative">
            <div
              className="video-glow-ring pointer-events-none absolute inset-0 -z-10 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1))",
                filter: "blur(20px)",
                transform: "scale(1.02)",
              }}
            />
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
