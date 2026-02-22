import Image from 'next/image'

export default function AppliedAISection() {
  return (
    <section id="applied-ai" className="py-20 bg-white dark:bg-gray-900">
      {/* Hero / Intro */}
      <div className="max-w-4xl mx-auto text-center px-6">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
          Applied AI
        </h2>
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
          I build and ship real-world AI systems that solve problems at the
          intersection of human intent, scalable intelligence, and practical execution.
        </p>
        <p className="mt-2 text-lg text-gray-700 dark:text-gray-300">
          From autonomous agent teams and prompt-engineered workflows to
          crypto-integrated systems, this section showcases working technology
          — not ideas.
        </p>
      </div>

      {/* Featured Projects */}
      <div className="mt-16 grid gap-10 max-w-6xl mx-auto px-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Project Card */}
        <ProjectCard
          title="YSKAIPE Beta Pods Orchestrator"
          description="AI-orchestrated system that transforms a single seed prompt into a coordinated execution team."
          tech={['GPT-4o', 'Claude', 'LangGraph', 'Node.js']}
          href="#beta-pods"
        />
        <ProjectCard
          title="On-Chain Research RAG Engine"
          description="Retrieval-augmented crypto research powered by structured retrieval and real-time event monitoring."
          tech={['RAG', 'VectorDB', 'Web3 APIs']}
          href="#rag-engine"
        />
        <ProjectCard
          title="Wallet Assistant Agent"
          description="Intelligent agent summarizing and annotating on-chain activity in real time."
          tech={['Tool Chains', 'Structured Outputs']}
          href="#wallet-agent"
        />
      </div>

      {/* Tools & Stack */}
      <div className="mt-20 max-w-4xl mx-auto px-6">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Tools & Stack
        </h3>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          Frontend, AI systems, and deployment tooling that powers the projects above.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
          {[
            'Claude 3.5 / GPT-4o / Llama 3.1',
            'LangChain, LangGraph, CrewAI',
            'Pinecone / FAISS',
            'AWS / GCP / Vercel',
            'Web3.js / ethers.js',
            'PyTorch / Hugging Face',
          ].map((item) => (
            <li key={item} className="list-disc ml-4">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Call to Action */}
      <div className="mt-16 text-center px-6">
        <a
          href="#contact"
          className="inline-block bg-indigo-600 text-white font-semibold py-3 px-8 rounded-md hover:bg-indigo-700 transition"
        >
          Let’s Talk
        </a>
      </div>
    </section>
  )
}

// Reusable Project Card
function ProjectCard({
  title,
  description,
  tech,
  href,
}: {
  title: string
  description: string
  tech: string[]
  href: string
}) {
  return (
    <a
      href={href}
      className="block p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition"
    >
      <h4 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h4>
      <p className="mt-2 text-gray-700 dark:text-gray-300">{description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {tech.map((t) => (
          <span
            key={t}
            className="text-sm bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-100 rounded-full py-1 px-3"
          >
            {t}
          </span>
        ))}
      </div>
    </a>
  )
}
