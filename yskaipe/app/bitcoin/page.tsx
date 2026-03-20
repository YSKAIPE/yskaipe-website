import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import MazePage from '@/components/MazePage'

export const metadata = {
  title: 'YSKAIPE Bitcoin — Navigate the Bitcoin & DeFi Maze',
  description: 'HODLing strategy, DeFi yield, cold storage, Lightning Network — AI maps your path through the Bitcoin maze.',
}

export default function BitcoinPage() {
  return (
    <>
      <Nav />
      <MazePage
        tag="YSKAIPE BITCOIN"
        color="#f7931a"
        bg="#fffaf2"
        icon="₿"
        title="THE BITCOIN MAZE"
        premise="The financial system is a maze built to keep you inside. Bitcoin is the exit door. DeFi is the path through. You don't need a bank, a broker, or permission — you need a map."
        exit="Generational digital wealth"
        sections={[
          {
            heading: 'HODL Strategy',
            body: 'Most people lose Bitcoin not to the market but to their own panic. AI helps you build a conviction framework — position sizing, cold storage architecture, multisig setup — so volatility becomes noise instead of a trigger.',
            paths: [
              'Cold storage setup: hardware wallets, seed phrase security, multisig vaults',
              'Position sizing and DCA strategies tuned to your risk tolerance',
              'How to avoid the classic mistakes: exchanges, hot wallets, paper hands',
              'The psychology maze: how to HODL through 50%+ drawdowns',
            ],
          },
          {
            heading: 'DeFi on Bitcoin',
            body: 'Bitcoin DeFi has matured. You can now earn yield on your stack, borrow against it, and participate in decentralized protocols — without leaving the Bitcoin ecosystem or surrendering custody.',
            paths: [
              'Wrapped Bitcoin and cross-chain DeFi yield strategies',
              'Bitcoin-backed lending: liquidity without selling your stack',
              'Stacking sats with Lightning Network routing revenue',
              'Evaluating DeFi protocol risk — which mazes are traps',
            ],
          },
          {
            heading: 'Sovereign Spending',
            body: 'Bitcoin as a daily currency is a maze most never solve. The Lightning Network changes that — instant, near-zero fee, self-custodied transactions. AI helps you navigate the setup and the spending strategy.',
            paths: [
              'Lightning node setup: Umbrel, RaspiBlitz, or hosted options',
              'Spending Bitcoin without selling: payment flow design',
              'Privacy best practices: coin control, CoinJoin, address reuse',
              'Tax-efficient Bitcoin strategies for your jurisdiction',
            ],
          },
          {
            heading: 'Generational Wealth Planning',
            body: 'Bitcoin as digital gold only works if you can pass it on. Estate planning for Bitcoin is its own maze — one most advisors can\'t navigate. AI maps the legal, technical, and family communication paths.',
            paths: [
              'Multi-generational inheritance setup without custodians',
              'Dead man\'s switch and time-locked transaction planning',
              'How to communicate Bitcoin holdings to family',
              'Integrating Bitcoin into broader estate and tax planning',
            ],
          },
        ]}
      />
      <Footer />
    </>
  )
}
