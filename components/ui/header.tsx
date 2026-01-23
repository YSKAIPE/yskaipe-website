// components/ui/header.tsx - FULL REPLACEMENT
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[999] bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-blue-400">
          YSKAIPE
        </Link>

        {/* Nav + Buttons */}
        <nav className="flex items-center gap-8">
          <Link href="/prototype" className="text-gray-300 hover:text-white transition">
            Prototype
          </Link>
          <Link href="/about" className="text-gray-300 hover:text-white transition">
            About
          </Link>
          <Link href="/login" className="text-gray-300 hover:text-white transition">
            Login
          </Link>
          <Link href="/signup" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition">
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}