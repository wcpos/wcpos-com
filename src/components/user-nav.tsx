import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function UserNav() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/login">Sign in</Link>
    </Button>
  )
}
