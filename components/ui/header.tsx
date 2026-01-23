// components/ui/header.tsx

import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo: text fallback (safe if image missing) */}
        <Link href="/" className="flex items-center text-2xl font-bold text-blue-600 dark:text-blue-400">
          YSKAIPE
          {/* Uncomment and adjust if you have a logo image in /public/ */}
          {/* <img src="/images/logo.svg" alt="YSKAIPE" className="h-10 w-auto ml-2" /> */}
        </Link>

        {/* Navigation + Login/Sign Up buttons – always visible */}
        <nav className="flex items-center space-x-8">
          <Link
            href="/prototype"
            className="text-gray-800 dark:text-gray-200 hover:text-blue-600 font-medium transition"
          >
            Prototype
          </Link>
          <Link
            href="/about"
            className="text-gray-800 dark:text-gray-200 hover:text-blue-600 font-medium transition"
          >
            About
          </Link>

          {/* Login & Sign Up – forced visible, no conditionals */}
          <Link
            href="/login"
            className="text-gray-800 dark:text-gray-200 hover:text-blue-600 font-medium transition"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-md hover:bg-blue-700 font-medium transition"
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}