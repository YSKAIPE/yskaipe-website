import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Ticker from '@/components/Ticker'
import MazeGrid from '@/components/MazeGrid'
import Manifesto from '@/components/Manifesto'
import PromptBar from '@/components/PromptBar'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <MazeGrid />
        <Manifesto />
        <PromptBar />
      </main>
      <Footer />
    </>
  )
}
