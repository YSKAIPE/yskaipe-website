import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import MazePage from '@/components/MazePage'

export const metadata = {
  title: 'YSKAIPE the Garden — Navigate the Food Growing Maze',
  description: 'Planting calendars, soil health, perennial fruits, succession planting — AI maps your path from confusion to year-round harvest.',
}

export default function GardenPage() {
  return (
    <>
      <Nav />
      <MazePage
        tag="YSKAIPE THE GARDEN"
        color="#a03060"
        bg="#fdf0f5"
        icon="🌿"
        title="THE GARDEN MAZE"
        premise="Soil, seeds, seasons — three variables that feel random until AI reads them together. The garden maze isn't about green thumbs. It's about knowing which wall to walk through next, and when."
        exit="Year-round abundance from your own land"
        sections={[
          {
            heading: 'Planting Calendars',
            body: 'Generic planting guides are useless — they don\'t know your last frost date, your microclimate, your elevation, or your goals. AI builds a personalized week-by-week planting calendar for your exact zip code and garden setup.',
            paths: [
              'Last frost / first frost precision mapping for your NC zip code',
              'Indoor seed starting schedule: 8–12 weeks before transplant',
              'Direct sow vs transplant decision tree for each crop',
              'Season extension: row covers, cold frames, low tunnels',
              'Fall and winter garden planning for year-round production',
            ],
          },
          {
            heading: 'Soil Health',
            body: 'Most garden problems are soil problems in disguise. AI interprets your soil test results, identifies deficiencies, and builds a multi-year amendment plan using compost, cover crops, and targeted minerals.',
            paths: [
              'Soil test interpretation: N-P-K, pH, organic matter, micronutrients',
              'Compost recipe and timeline for your available materials',
              'Cover crop selection for your rotation and climate zone',
              'No-till transition: sheet mulching, lasagna beds, broadfork',
              'Mycorrhizal inoculation and soil biology strategies',
            ],
          },
          {
            heading: 'Perennial Fruits & Berries',
            body: 'Perennials are the highest ROI garden investment — plant once, harvest for decades. The maze is in variety selection, establishment years, and positioning. AI designs your perennial system for your site and climate.',
            paths: [
              'Blackberry trellis systems: erect vs trailing, thornless varieties',
              'Blueberry soil acidification: sulfur timing and testing cadence',
              'Strawberry bed rotation and renovation cycles',
              'Apple and pear variety selection for NC mountains (chill hours)',
              'Elderberry, pawpaw, and native fruit integration',
            ],
          },
          {
            heading: 'Succession & Harvest Planning',
            body: 'A single planting leads to feast and famine. Succession planting — staggered sowings every 2–3 weeks — creates continuous harvest. AI builds the succession schedule and the preservation plan for your harvest windows.',
            paths: [
              'Succession sowing intervals by crop: lettuce, beans, radishes, brassicas',
              'Harvest window mapping: what\'s ready when, all year',
              'Food preservation planning: canning, freezing, fermenting, root cellaring',
              'Seed saving basics for self-sufficient garden cycles',
              'Integrating chickens or ducks as garden pest management',
            ],
          },
        ]}
      />
      <Footer />
    </>
  )
}
