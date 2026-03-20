import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import MazePage from '@/components/MazePage'

export const metadata = {
  title: 'YSKAIPE Sustainability — Navigate the Land & Homesteading Maze',
  description: 'Christmas tree farms, blackberry operations, off-grid systems, permaculture — AI maps your path from raw acres to living land.',
}

export default function SustainPage() {
  return (
    <>
      <Nav />
      <MazePage
        tag="YSKAIPE SUSTAINABILITY"
        color="#3d6b2a"
        bg="#f2f5ee"
        icon="🌲"
        title="THE LAND MAZE"
        premise="Raw acres look like a blank wall. Seasons, soil types, microclimates, cash flow timelines — the land maze has a thousand variables. AI reads them together and finds the path to a living, cash-flowing piece of ground."
        exit="Soil sovereignty + cash-flowing land"
        sections={[
          {
            heading: 'Christmas Tree Farming',
            body: 'A well-planted Christmas tree operation on 2–10 acres in the NC mountains can generate $30k–$80k/year at maturity. The maze: species selection, planting density, timing, shearing, and retail vs wholesale channels. AI maps the 7-year path from seedling to income.',
            paths: [
              'Species selection: Fraser fir, Canaan fir, or Douglas fir for your elevation',
              'Planting density, spacing, and per-acre yield projections',
              'Shearing calendar and quality management over 7–10 year cycle',
              'Retail u-cut vs wholesale: margin analysis and market channels',
              'NC mountain microclimate planning: frost pockets, aspect, soil pH',
            ],
          },
          {
            heading: 'Berry & Fruit Operations',
            body: 'Blackberries, blueberries, and perennial fruit are the highest-margin per-acre crops for small mountain farms. The maze is in variety selection, establishment costs, harvest windows, and finding buyers. AI builds the enterprise budget and planting plan.',
            paths: [
              'Blackberry variety selection for thornless, high-yield production',
              'Trellis system design and establishment cost modeling',
              'U-pick vs direct sales vs farmers market channel analysis',
              'Companion planting with christmas trees for dual income streams',
              'Blueberry soil acidification: testing, amendment, timeline',
            ],
          },
          {
            heading: 'Off-Grid Systems',
            body: 'True land sovereignty means owning your inputs: power, water, heat. The off-grid maze is in system sizing, equipment selection, and integration. AI designs the solar array, water catchment, and backup systems for your specific property.',
            paths: [
              'Solar array sizing for your load profile + NC sun hours',
              'Battery bank design: lithium vs lead acid, days of autonomy',
              'Rainwater catchment + gravity-fed systems for homestead use',
              'Propane vs wood vs solar thermal for heating and cooking',
              'Grid-tie vs fully off-grid: financial and resilience tradeoffs',
            ],
          },
          {
            heading: 'Regenerative Land Design',
            body: 'Permaculture and regenerative agriculture aren\'t just philosophy — they\'re the most economically resilient approach to small-scale farming. AI designs stacked enterprises: trees + animals + vegetables + fungi + water that work together as a system.',
            paths: [
              'Whole-farm permaculture design for your topography and goals',
              'Silvopasture: integrating livestock with tree crops',
              'Food forest design: canopy, understory, groundcover layers',
              'Soil building timeline: from degraded to rich in 3–5 years',
              'Agritourism layering: retreats, workshops, farm stays',
            ],
          },
        ]}
      />
      <Footer />
    </>
  )
}
