import { AdminHeader } from '@/components/admin/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <AdminHeader
        title="Settings"
        description="Manage application settings and configuration"
      />

      <div className="flex-1 space-y-6 p-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Basic application configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input id="siteName" defaultValue="WooCommerce POS" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input id="supportEmail" type="email" defaultValue="support@wcpos.com" />
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle>API Settings</CardTitle>
            <CardDescription>
              Configure API behavior and rate limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cacheTime">Cache Duration (seconds)</Label>
              <Input id="cacheTime" type="number" defaultValue="300" />
              <p className="text-xs text-muted-foreground">
                How long to cache GitHub API responses
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="rateLimit">Rate Limit (requests/minute)</Label>
              <Input id="rateLimit" type="number" defaultValue="60" />
              <p className="text-xs text-muted-foreground">
                Maximum requests per IP per minute
              </p>
            </div>
          </CardContent>
        </Card>

        {/* GitHub Integration */}
        <Card>
          <CardHeader>
            <CardTitle>GitHub Integration</CardTitle>
            <CardDescription>
              Configure GitHub API access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="githubOrg">GitHub Organization</Label>
              <Input id="githubOrg" defaultValue="wcpos" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="githubToken">Personal Access Token</Label>
              <Input
                id="githubToken"
                type="password"
                placeholder="ghp_••••••••••••••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Set via GH_PAT environment variable for security
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  )
}

