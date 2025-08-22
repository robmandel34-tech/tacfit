import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-surface-elevated">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-8 w-8 text-military-green" />
            <h1 className="text-3xl font-bold text-black">Settings</h1>
          </div>
          <p className="text-black">
            Manage your app preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Settings sections can be added here */}
          <Card className="bg-surface-elevated border-border-subtle">
            <CardHeader>
              <CardTitle className="text-white">Settings Coming Soon</CardTitle>
              <CardDescription className="text-gray-300">
                Customization options will be available in future updates.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}