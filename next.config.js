/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/autoquote', destination: '/autoquote.html' },
      { source: '/about', destination: '/about.html' },
      { source: '/beta-pods', destination: '/beta-pods.html' },
      { source: '/bitcoin-natives', destination: '/bitcoin-natives.html' },
      { source: '/build-in-public', destination: '/build-in-public.html' },
      { source: '/careers', destination: '/careers.html' },
      { source: '/contact', destination: '/contact.html' },
      { source: '/index', destination: '/index.html' },
      { source: '/nick-conenna-yskaipe', destination: '/nick-conenna-yskaipe.html' },
      { source: '/peaking-waters', destination: '/peaking-waters.html' },
      { source: '/pitch', destination: '/pitch.html' },
      { source: '/pricing', destination: '/pricing.html' },
      { source: '/privacy', destination: '/privacy.html' },
      { source: '/prototype', destination: '/prototype.html' },
      { source: '/roadmap', destination: '/roadmap.html' },
      { source: '/terms', destination: '/terms.html' },
      { source: '/use-cases', destination: '/use-cases.html' },
      { source: '/waitlist', destination: '/waitlist.html' },
      { source: '/yskaipe-ai-leverage-study', destination: '/yskaipe-ai-leverage-study.html' },
      { source: '/yskaipe-bitcoin', destination: '/yskaipe-bitcoin.html' },
      { source: '/yskaipe-breadcraft', destination: '/yskaipe-breadcraft.html' },
      { source: '/yskaipe-build-log', destination: '/yskaipe-build-log.html' },
      { source: '/yskaipe-leverage', destination: '/yskaipe-leverage.html' },
      { source: '/yskaipe-muscadine', destination: '/yskaipe-muscadine.html' },
      { source: '/yskaipe-the-paradox', destination: '/yskaipe-the-paradox.html' },
      { source: '/yskaipe-vibe-coding', destination: '/yskaipe-vibe-coding.html' },
    ]
  },
}
module.exports = nextConfig
