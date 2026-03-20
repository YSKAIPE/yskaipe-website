import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import MazePage from '@/components/MazePage'

export const metadata = {
  title: 'YSKAIPE AI — Navigate the AI Building & Automation Maze',
  description: 'Multi-agent systems, agentic pipelines, AI pods, prompt engineering — AI maps your path from overwhelm to operational leverage.',
}

export default function AiPage() {
  return (
    <>
      <Nav />
      <MazePage
        tag="YSKAIPE AI"
        color="#1a3a8f"
        bg="#eff3fa"
        icon="⚡"
        title="THE AI MAZE"
        premise="The AI maze has a thousand tools, a new framework every week, and no clear path for your specific situation. YSKAIPE maps which agents, which stacks, which prompts actually matter — and cuts the rest."
        exit="Empire without employees"
        sections={[
          {
            heading: 'Multi-Agent Systems',
            body: 'Single-prompt AI is a dead end. The exit is multi-agent orchestration — specialized agents working in parallel, passing outputs, checking each other\'s work. AI maps the architecture for your use case so you stop prompting and start operating.',
            paths: [
              'Orchestrator + specialist agent architecture for your workflow',
              'When to use Claude vs GPT vs Gemini vs local models',
              'Agent memory, context windows, and state management',
              'Error handling and human-in-the-loop checkpoints',
              'Cost optimization: batching, caching, model routing',
            ],
          },
          {
            heading: 'AI Pods & Human Collaboration',
            body: 'The highest-leverage systems combine AI agents with the right humans at the right moments. AI Pods — the original YSKAIPE model — orchestrate small teams of humans and AI to execute at a scale impossible alone.',
            paths: [
              'Pod design: which roles are AI, which are human, which are hybrid',
              'Async coordination: how AI manages handoffs without bottlenecks',
              'Recruiting and briefing human pod members for AI-augmented work',
              'Quality loops: AI review, human spot-check, output standards',
              'Scaling pods: from 1 pod to many without complexity explosion',
            ],
          },
          {
            heading: 'Building AI-Powered Products',
            body: 'Niche SaaS built on top of AI APIs is the fastest path to solo founder leverage right now. The maze is in picking the right niche, designing the right prompts, and shipping before the window closes.',
            paths: [
              'Niche selection: where AI creates 10x value over existing tools',
              'Prompt engineering as product design: structured outputs, tool use',
              'Stack decisions: Next.js + Claude API + Vercel for fastest shipping',
              'Pricing, packaging, and positioning for AI-native products',
              'Distribution: finding early users in niche communities',
            ],
          },
          {
            heading: 'Agentic Content & Monetization',
            body: 'Content creation, research, SEO, newsletters, social — all of it can be run by an agentic stack with you as creative director. AI designs the pipeline, maps the tools, and identifies where human taste adds the irreplaceable layer.',
            paths: [
              'Content pipeline design: research → draft → edit → publish → distribute',
              'Automated SEO research and content brief generation',
              'Newsletter production systems with AI + light human editing',
              'Affiliate and digital product monetization layered on content',
              'Brand voice training: making AI output sound like you',
            ],
          },
        ]}
      />
      <Footer />
    </>
  )
}
