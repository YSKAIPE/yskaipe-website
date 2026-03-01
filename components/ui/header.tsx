import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 bg-black/50 backdrop-blur-md z-50 py-4 px-6 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold">YSKAIPE</Link>
      <nav className="hidden md:flex space-x-6">
        <Link href="/">Home</Link>
        <Link href="/about.html">About</Link>
        <Link href="/beta-pods.html">Beta Pods</Link>
        <Link href="/yskaipe-build-log.html">Build Log</Link>
        <Link href="/prototype.html">Demo</Link>
        <Link href="/waitlist.html">Join Waitlist</Link>
        <Link href="/build-in-public.html">Collaborate</Link>
        <Link href="/yskaipe-build-log.html">AI Dev Hub</Link>
        <Link href="/roadmap.html">Roadmap & Funding</Link>
      </nav>
      <div className="flex space-x-4">
        <a href="https://x.com/yskaipe" target="_blank">X</a>
        <a href="https://github.com/YSKAIPE" target="_blank">GitHub</a>
        <a href="https://linkedin.com/in/nickconenna" target="_blank">LinkedIn</a>
        <a href="https://calendly.com/yskaipe" target="_blank">Calendar</a>
      </div>
      {/* Add mobile menu toggle here if needed */}
    </header>
  );
}
