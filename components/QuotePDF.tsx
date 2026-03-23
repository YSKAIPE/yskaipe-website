import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { QuoteResult } from '@/types/quote'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    padding: 48,
  },
  header: {
    backgroundColor: '#0a0a0a',
    margin: -48,
    marginBottom: 32,
    padding: 32,
  },
  headerLabel: {
    fontSize: 9,
    color: '#888888',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 9,
    color: '#999999',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#f9f8f5',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
  },
  metricBoxDark: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    color: '#999999',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricLabelDark: {
    fontSize: 9,
    color: '#666666',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#0a0a0a',
  },
  metricValueDark: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  metricSub: {
    fontSize: 10,
    color: '#aaaaaa',
    marginTop: 2,
  },
  breakdownBox: {
    backgroundColor: '#f9f8f5',
    borderRadius: 6,
    padding: 16,
  },
  breakdownText: {
    fontSize: 12,
    color: '#555555',
    lineHeight: 1.7,
  },
  materialItem: {
    fontSize: 12,
    color: '#555555',
    marginBottom: 4,
    paddingLeft: 12,
  },
  notesBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#e8a020',
    paddingLeft: 14,
    marginTop: 4,
  },
  notesText: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 1.6,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0eeea',
    marginBottom: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0eeea',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 9,
    color: '#aaaaaa',
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tradeName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0a0a0a',
  },
  complexityBadge: {
    fontSize: 11,
    color: '#666666',
    textTransform: 'capitalize',
  },
  descText: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 1.6,
    marginBottom: 4,
  },
})

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function QuotePDF({ quote }: { quote: QuoteResult }) {
  return (
    <Document title={`YSKAIPE AutoQuote — ${quote.trade}`} author="YSKAIPE">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>YSKAIPE AutoQuote · Standard Cost Estimate</Text>
          <Text style={styles.headerTitle}>Your {quote.trade} Estimate</Text>
        </View>

        {/* Trade info */}
        <View style={styles.section}>
          <View style={styles.tradeRow}>
            <View>
              <Text style={styles.sectionLabel}>Trade</Text>
              <Text style={styles.tradeName}>{quote.trade}</Text>
            </View>
            <View>
              <Text style={styles.sectionLabel}>Complexity</Text>
              <Text style={styles.complexityBadge}>{quote.complexity}</Text>
            </View>
            <View>
              <Text style={styles.sectionLabel}>Timeline</Text>
              <Text style={styles.complexityBadge}>{quote.time_estimate}</Text>
            </View>
          </View>
          <Text style={styles.descText}>{quote.description}</Text>
        </View>

        <View style={styles.divider} />

        {/* Cost metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Cost breakdown</Text>
          <View style={styles.row}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Labor</Text>
              <Text style={styles.metricValue}>{formatCurrency(quote.labor_total)}</Text>
              <Text style={styles.metricSub}>{quote.labor_hours}h @ {formatCurrency(quote.labor_rate)}/hr</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Materials</Text>
              <Text style={styles.metricValue}>{formatCurrency(quote.materials_total)}</Text>
            </View>
            <View style={styles.metricBoxDark}>
              <Text style={styles.metricLabelDark}>Total standard</Text>
              <Text style={styles.metricValueDark}>{formatCurrency(quote.grand_total)}</Text>
            </View>
          </View>
        </View>

        {/* Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Estimate breakdown</Text>
          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownText}>{quote.breakdown}</Text>
          </View>
        </View>

        {/* Materials */}
        {quote.materials_list?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Materials list</Text>
            {quote.materials_list.map((item, i) => (
              <Text key={i} style={styles.materialItem}>· {item}</Text>
            ))}
          </View>
        )}

        {/* Notes */}
        {quote.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Important notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{quote.notes}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>YSKAIPE · Human Hands. AI Power. · yskaipe.com</Text>
          <Text style={styles.footerText}>
            {quote.id ? `Quote ID: ${quote.id.substring(0, 8)}` : 'Standard cost estimate'}
            {' · '}
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

      </Page>
    </Document>
  )
}
