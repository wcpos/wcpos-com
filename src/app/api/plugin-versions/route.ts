import { NextResponse } from 'next/server'

const GITHUB_API_BASE = 'https://api.github.com'
const FREE_REPO = 'wcpos/woocommerce-pos'
const PRO_REPO = 'wcpos/woocommerce-pos-pro'

async function fetchLatestRelease(repo: string): Promise<string | null> {
  try {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    }
    
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const response = await fetch(`${GITHUB_API_BASE}/repos/${repo}/releases/latest`, {
      headers,
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      console.error(`Failed to fetch release for ${repo}: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.tag_name?.replace(/^v/, '') || null
  } catch (error) {
    console.error(`Error fetching release for ${repo}:`, error)
    return null
  }
}

export async function GET() {
  try {
    const [freeVersion, proVersion] = await Promise.all([
      fetchLatestRelease(FREE_REPO),
      fetchLatestRelease(PRO_REPO)
    ])

    return NextResponse.json({
      free: freeVersion,
      pro: proVersion
    })
  } catch (error) {
    console.error('Error in plugin-versions API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plugin versions' },
      { status: 500 }
    )
  }
}