import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { env } from '@/utils/env'
import { apiLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret')

  if (!env.GITHUB_WEBHOOK_SECRET || secret !== env.GITHUB_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    revalidateTag('roadmap', 'roadmap')
    apiLogger.info`Roadmap cache revalidated via webhook`
    return NextResponse.json({ revalidated: true })
  } catch (error) {
    apiLogger.error`Failed to revalidate roadmap cache: ${error}`
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
