import Image from "next/image";
import BannerImage from "@/public/images/*yskaipe-the-paraxox.jpg";

export default function HeroHome() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero content */}
        <div className="py-12 md:py-20">
          {/* Section header */}
          <div className="pb-12 text-center md:pb-20">
            <h1
              className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-5 font-nacelle text-4xl font-semibold text-transparent md:text-5xl"
              data-aos="fade-up"
            >
              YSKAIPE the PARADOX
            </h1>

            <div className="mx-auto max-w-3xl">
              <p
                className="mb-8 whitespace-pre-line text-xl text-indigo-200/65"
                data-aos="fade-up"
                data-aos-delay={200}
              >
                {`Everything changes. Nothing changes.
AI races exponentially forward while the human soul asks the same ancient questions.`}
              </p>

              <div className="mx-auto max-w-xs sm:flex sm:max-w-none sm:justify-center">
                <div data-aos="fade-up" data-aos-delay={400}>
                  <a
                    className="btn group mb-4 w-full bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%] sm:mb-0 sm:w-auto"
                    href="/yskaipe-the-paradox.html"
                  >
                    <span className="relative inline-flex items-center">
                      YSKAIPE the PARADOX
                      <span className="ml-1 text-white/50 transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </a>
                </div>

                <div data-aos="fade-up" data-aos-delay={600}>
                  <a
                    className="btn relative w-full bg-linear-to-b from-gray-800 to-gray-800/60 bg-[length:100%_100%] bg-[bottom] text-gray-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] hover:bg-[length:100%_150%] sm:ml-4 sm:w-auto"
                    href="/about.html"
                  >
                    About YSKAIPE
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Banner image */}
          <div
            className="mx-auto max-w-5xl"
            data-aos="fade-up"
            data-aos-delay={800}
          >
            <Image
              src={BannerImage}
              alt="YSKAIPE the PARADOX"
              className="rounded-2xl shadow-2xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
