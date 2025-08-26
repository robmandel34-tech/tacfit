// Webhook service for notifying external websites about points updates

interface PointsUpdatePayload {
  userId: number;
  username: string;
  email: string;
  previousPoints: number;
  newPoints: number;
  pointsChange: number;
  reason: string;
  timestamp: string;
}

export class WebhookService {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = process.env.EXTERNAL_WEBHOOK_URL;
  }

  // Send webhook notification when points are updated
  async notifyPointsUpdate(payload: PointsUpdatePayload): Promise<void> {
    if (!this.webhookUrl) {
      console.log('No webhook URL configured, skipping notification');
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': 'TacFit-Points-Sync',
          'X-Webhook-Signature': this.generateSignature(JSON.stringify(payload))
        },
        body: JSON.stringify({
          event: 'points_updated',
          data: payload
        })
      });

      if (response.ok) {
        console.log(`✓ Webhook notification sent for user ${payload.userId}: ${payload.pointsChange} points`);
      } else {
        console.error(`✗ Webhook notification failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending webhook notification:', error);
    }
  }

  // Generate simple signature for webhook security (optional)
  private generateSignature(payload: string): string {
    const secret = process.env.WEBHOOK_SECRET || 'default-secret';
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}

export const webhookService = new WebhookService();