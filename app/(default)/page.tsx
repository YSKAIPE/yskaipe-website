export const metadata = {
  title: "Welcome to YSKAIPE",
  description: "Page description",
};

import PageIllustration from "@/components/page-illustration";
import Hero from "@/components/hero-home";
import BuildInPublic from "@/components/build-in-public"; 
import BetaPods from "@/components/beta-pods"; 
import Workflows from "@/components/workflows";
import Features from "@/components/features";
import Testimonials from "@/components/testimonials";
import Cta from "@/components/cta";




export default function Home() {
  return (
    <>
      <PageIllustration />
      <Hero />
      <BuildInPublic />
      <BetaPods />
      <Workflows />
      <Features />
      <Testimonials />
      <Cta />
    </>

  );
}
