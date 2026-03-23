import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { QuotePDF } from '@/components/QuotePDF'
import { QuoteResult } from '@/types/quote'

export async function POST(req: NextRequest) {
  try {
    const { quote }: { quote: QuoteResult } = await req.json()

    if (!quote) {
      return NextResponse.json({ error: 'quote is required' }, { status: 400 })
    }

    const buffer = await renderToBuffer(createElement(QuotePDF, { quote }))

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="yskaipe-quote-${quote.trade.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    })
  } catch (err) {
    console.error('PDF export error:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
