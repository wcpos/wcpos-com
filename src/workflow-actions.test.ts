import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('CI workflow action references', () => {
  it('pins every external action to an immutable commit', () => {
    // The `uses` value is what GitHub Actions resolves, so this configuration
    // check directly exercises the supply-chain property under review.
    const workflow = readFileSync(
      resolve(process.cwd(), '.github/workflows/ci.yml'),
      'utf8'
    )
    const actionRefs = [...workflow.matchAll(/^\s*uses:\s+([^\s#]+)/gm)].map(
      ([, actionRef]) => actionRef
    )

    expect(actionRefs).not.toHaveLength(0)
    expect(
      actionRefs.filter((actionRef) => !/^[^@\s]+@[0-9a-f]{40}$/.test(actionRef))
    ).toEqual([])
  })
})
