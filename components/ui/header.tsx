
"use client";

import Link from "next/link";
import Logo from "./logo";

export default function Header() {
  return (
    <header className="z-30 mt-2 w-full md:mt-5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative flex h-14 items-center justify-between gap-3 rounded-2xl bg-gray-900/90 px-3 sm:px-6 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] after:absolute after:inset-0 after:-z-10 after:backdrop-blur-xs">
          
          {/* Logo */}
          <div className="flex flex-1 items-center">
            <Logo />
          </div>

          {/* Desktop Nav + Auth */}
          <div className="hidden md:flex md:items-center md:gap-6 lg:gap-8 text-sm font-medium">
            <Link href="/beta-pods.html" className="text-gray-300 hover:text-white transition-colors">
              Beta Pods
            </Link>
            <Link href="/yskaipe-build-log.html" className="text-gray-300 hover:text-white transition-colors">
              Build Log
            </Link>
            <Link href="/build-in-public.html" className="text-gray-300 hover:text-white transition-colors">
              Collaborate
            </Link>
            <Link href="/roadmap.html" className="text-gray-300 hover:text-white transition-colors">
              Roadmap
            </Link>
            <a 
              href="https://x.com/yskaipe" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
            >
              X
            </a>
            <a 
              href="https://github.com/yskaipe" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <Link href="/about.html" className="text-gray-300 hover:text-white transition-colors">
              About
            </Link>
          </div>

          {/* Desktop Sign In / Register */}
          <div className="hidden md:flex md:items-center gap-3">
            <Link
              href="/signin"
              className="btn-sm relative bg-linear-to-b from-gray-800 to-gray-800/60 bg-[length:100%_100%] bg-[bottom] py-[5px] text-gray-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] hover:bg-[length:100%_150%]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="btn-sm bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] py-[5px] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
            >
              Register
            </Link>
          </div>

          {/* Mobile Hamburger (CSS-only) */}
          <div className="md:hidden">
            <label htmlFor="mobile-menu" className="cursor-pointer text-gray-300 hover:text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          </div>
        </div>

        {/* Mobile Menu – appears when checkbox checked (pure CSS) */}
        <input type="checkbox" id="mobile-menu" className="hidden peer" />
        <div className="md:hidden peer-checked:block bg-gray-900/95 border-t border-gray-800 backdrop-blur-sm mt-2 rounded-b-xl overflow-hidden">
          <nav className="flex flex-col px-6 py-4 space-y-4 text-base">
            <Link href="/beta-pods.html" className="text-gray-300 hover:text-white">
              Beta Pods
            </Link>
            <Link href="/yskaipe-build-log.html" className="text-gray-300 hover:text-white">
              Build Log
            </Link>
            <Link href="/build-in-public.html" className="text-gray-300 hover:text-white">
              Collaborate
            </Link>
            <Link href="/roadmap.html" className="text-gray-300 hover:text-white">
              Roadmap
            </Link>
            <a href="https://x.com/yskaipe" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
              X
            </a>
            <a href="https://github.com/yskaipe" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
              GitHub
            </a>
            <Link href="/about.html" className="text-gray-300 hover:text-white">
              About
            </Link>

            {/* Mobile auth */}
            <div className="flex flex-col gap-3 pt-2 border-t border-gray-800">
              <Link href="/signin" className="btn-sm text-center bg-linear-to-b from-gray-800 to-gray-800/60 text-gray-300 hover:bg-[length:100%_150%]">
                Sign In
              </Link>
              <Link href="/signup" className="btn-sm text-center bg-linear-to-t from-indigo-600 to-indigo-500 text-white hover:bg-[length:100%_150%]">
                Register
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

