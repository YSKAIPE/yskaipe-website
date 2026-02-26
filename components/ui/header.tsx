"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "./logo";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="z-50 mt-2 w-full md:mt-5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative flex h-14 items-center justify-between gap-3 rounded-2xl bg-gray-900/90 px-4 sm:px-6 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] after:absolute after:inset-0 after:-z-10 after:backdrop-blur-xs">
          
          {/* Logo / Branding */}
          <div className="flex flex-1 items-center">
            <Logo />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:gap-6 lg:gap-8 text-sm font-medium">
            <Link href="/beta-pods" className="text-gray-300 hover:text-white transition-colors">
              Beta Pods
            </Link>
            <Link href="/build-log" className="text-gray-300 hover:text-white transition-colors">
              Build Log
            </Link>
            <Link href="/collaborate" className="text-gray-300 hover:text-white transition-colors">
              Collaborate
            </Link>
            <Link href="/ai-dev-hub" className="text-gray-300 hover:text-white transition-colors">
              AI Dev Hub
            </Link>
            <Link href="/roadmap" className="text-gray-300 hover:text-white transition-colors">
              Roadmap & Funding
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
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
              About
            </Link>
          </nav>

          {/* Auth + Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Desktop Sign In / Register */}
            <div className="hidden md:flex md:items-center md:gap-3">
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

            {/* Mobile Hamburger */}
            <button
              className="md:hidden text-gray-300 hover:text-white focus:outline-none"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-gray-900/95 border-t border-gray-800 backdrop-blur-sm">
          <nav className="flex flex-col px-6 py-5 space-y-4 text-base">
            <Link
              href="/beta-pods"
              className="text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Beta Pods
            </Link>
            <Link
              href="/build-log"
              className="text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Build Log
            </Link>
            <Link
              href="/collaborate"
              className="text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Collaborate
            </Link>
            <Link
              href="/ai-dev-hub"
              className="text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              AI Dev Hub
            </Link>
            <Link
              href="/roadmap"
              className="text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Roadmap & Funding
            </Link>
            <a
              href="https://x.com/yskaipe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              X
            </a>
            <a
              href="https://github.com/yskaipe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              GitHub
            </a>
            <Link
              href="/about"
              className="text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>

            {/* Mobile Auth Buttons */}
            <div className="flex flex-col gap-3 pt-4 border-t border-gray-800">
              <Link
                href="/signin"
                className="btn-sm text-center bg-linear-to-b from-gray-800 to-gray-800/60 text-gray-300 hover:bg-[length:100%_150%]"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="btn-sm text-center bg-linear-to-t from-indigo-600 to-indigo-500 text-white hover:bg-[length:100%_150%]"
                onClick={() => setIsOpen(false)}
              >
                Register
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
