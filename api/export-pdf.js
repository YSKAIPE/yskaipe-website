const { renderToBuffer } = require('@react-pdf/renderer')
const { createElement } = require('react')
const { Document, Page, Text, View, StyleSheet } = require('@react-pdf/renderer')

function formatCurrency(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', backgroundColor: '#fff' },
  header: { marginBottom: 32 },
  brandLabel: { fontSize: 8, color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#0a0a0a' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e8e6e0', marginVertical: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0a0a0a', marginTop: 2 },
  costGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  costBox: { flex: 1, backgroundColor: '#f9f8f5', padding: 12, borderRadius: 4 },
  costBoxDark: { flex: 1, backgroundColor: '#0a0a0a', padding: 12, borderRadius: 4 },
  costLabel: { fontSize: 8, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  costLabelLight: { fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  costValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0a0a0a' },
  costValueLight: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#fff' },
  costSub: { fontSize: 9, color: '#aaa', marginTop: 2 },
  breakdownBox: { backgroundColor: '#f9f8f5', padding: 16, borderRadius: 4, marginBottom: 16 },
  breakdownLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  breakdownText: { fontSize: 11, color: '#555', lineHeight: 1.6 },
  sectionLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  materialItem: { fontSize: 11, color: '#555', marginBottom: 3 },
  notesBox: { borderLeftWidth: 3, borderLeftColor: '#e8a020', paddingLeft: 12, marginBottom: 16 },
  notesLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0a0a0a', marginBottom: 4 },
  notesText: { fontSize: 11, color: '#666', lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 9, color: '#aaa' },
})

function QuotePDFDoc({ quote }) {
  return createElement(Document, null,
    createElement(Page, { size: 'A4', style: styles.page },
      // Header
      createElement(View, { style: styles.header },
        createElement(Text, { style: styles.brandLabel }, 'YSKAIPE AutoQuote'),
        createElement(Text, { style: styles.title }, 'Standard Cost Estimate'),
      ),
      createElement(View, { style: styles.divider }),
      // Trade + complexity
      createElement(View, { style: styles.row },
        createElement(View, null,
          createElement(Text, { style: styles.label }, 'Trade'),
          createElement(Text, { style: styles.value }, quote.trade),
        ),
        createElement(View, null,
          createElement(Text, { style: styles.label }, 'Complexity'),
          createElement(Text, { style: styles.value }, quote.complexity),
        ),
        createElement(View, null,
          createElement(Text, { style: styles.label }, 'Time Estimate'),
          createElement(Text, { style: styles.value }, quote.time_estimate),
        ),
      ),
      createElement(View, { style: styles.divider }),
      // Cost boxes
      createElement(View, { style: styles.costGrid },
        createElement(View, { style: styles.costBox },
          createElement(Text, { style: styles.costLabel }, 'Labor'),
          createElement(Text, { style: styles.costValue }, formatCurrency(quote.labor_total)),
          createElement(Text, { style: styles.costSub }, `${quote.labor_hours}h @ ${formatCurrency(quote.labor_rate)}/hr`),
        ),
        createElement(View, { style: styles.costBox },
          createElement(Text, { style: styles.costLabel }, 'Materials'),
          createElement(Text, { style: styles.costValue }, formatCurrency(quote.materials_total)),
        ),
        createElement(View, { style: styles.costBoxDark },
          createElement(Text, { style: styles.costLabelLight }, 'Total Standard'),
          createElement(Text, { style: styles.costValueLight }, formatCurrency(quote.grand_total)),
        ),
      ),
      // Breakdown
      createElement(View, { style: styles.breakdownBox },
        createElement(Text, { style: styles.breakdownLabel }, 'Estimate Breakdown'),
        createElement(Text, { style: styles.breakdownText }, quote.breakdown),
      ),
      // Materials
      quote.materials_list?.length > 0 && createElement(View, { style: { marginBottom: 16 } },
        createElement(Text, { style: styles.sectionLabel }, 'Materials'),
        ...quote.materials_list.map((m, i) => createElement(Text, { key: i, style: styles.materialItem }, `• ${m}`)),
      ),
      // Notes
      quote.notes && createElement(View, { style: styles.notesBox },
        createElement(Text, { style: styles.notesLabel }, 'Important Notes'),
        createElement(Text, { style: styles.notesText }, quote.notes),
      ),
      // Footer
      createElement(View, { style: styles.footer },
        createElement(Text, { style: styles.footerText }, 'YSKAIPE · yskaipe.com · hello@yskaipe.com'),
        createElement(Text, { style: styles.footerText }, 'Based on verified NC 2026 industry standards'),
      ),
    )
  )
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { quote } = req.body

    if (!quote) {
      return res.status(400).json({ error: 'quote is required' })
    }

    const buffer = await renderToBuffer(createElement(QuotePDFDoc, { quote }))

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="yskaipe-quote-${quote.trade.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf"`)
    res.setHeader('Content-Length', buffer.length)
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('PDF export error:', err)
    return res.status(500).json({ error: 'Failed to generate PDF' })
  }
}
