export interface Article {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
}

export const ARTICLES: Article[] = [
  {
    id: 'getting-started-overview',
    category: 'Getting Started',
    title: 'Welcome to Mosaic',
    tags: ['overview', 'intro', 'setup'],
    content: `## What is Mosaic?

Mosaic is a physical world intelligence platform. It connects brands and retailers with a network of field collectors who visit stores, take compliance photos, and earn per verified submission.

## Key concepts

- **Campaigns** — A campaign defines which stores to audit, what photos to capture, and the payout per task
- **Tasks** — Each task is one photo job at one store for one collector
- **Collectors** — Vetted field agents who use the Mosaic mobile app to find and complete tasks
- **Compliance Score** — AI-generated score (0–100%) measuring how well a store meets your brand guidelines
- **Submissions** — A completed task with uploaded photos

## Quick start

1. Create a campaign from the Campaigns page
2. Upload your store list (CSV or manual)
3. Activate the campaign — tasks are created automatically
4. Collectors find and complete tasks in the mobile app
5. Photos are scored by AI within minutes
6. Review results in Gallery and Analytics`,
  },
  {
    id: 'campaigns-create',
    category: 'Campaigns',
    title: 'Creating a campaign',
    tags: ['campaign', 'create', 'setup', 'stores'],
    content: `## Creating your first campaign

Navigate to **Campaigns → New Campaign** and fill in:

- **Campaign name** — descriptive name visible to collectors
- **Brief** — instructions for collectors (what to photograph, angles, etc.)
- **Payout per task** — amount in pence paid to collectors per verified submission
- **Compliance rules** — optional: define specific rules for AI scoring

## Adding stores

After creating the campaign, upload stores via CSV or add them manually. Each store needs:
- Store name
- Address
- Latitude / Longitude (for GPS verification)

## Activating

Click **Activate Campaign** to create tasks for all stores and make them visible to collectors. You can pause or resume at any time.`,
  },
  {
    id: 'compliance-scoring',
    category: 'AI Scoring',
    title: 'How compliance scoring works',
    tags: ['ai', 'score', 'compliance', 'gpt4'],
    content: `## AI Compliance Scoring

Mosaic uses GPT-4o Vision to analyse every submitted photo against your brand guidelines.

## Scoring process

1. Collector submits photo(s)
2. Edge function sends image to GPT-4o Vision
3. AI evaluates against your compliance rules
4. Score (0–100%) is written back to the submission
5. If score < threshold, an alert is created

## Compliance rules

You can define custom rules per campaign in **Campaign Settings → Compliance Rules**:
- Product placement rules ("Product must be front-facing")
- Shelf share rules ("Brand must occupy ≥30% of shelf")
- Pricing rules ("Price label must be visible")

## Score interpretation

- **80–100%** — Compliant (green)
- **60–79%** — Needs attention (yellow)
- **0–59%** — Non-compliant (red)

The threshold for alerts is configurable per campaign.`,
  },
  {
    id: 'payouts-stripe',
    category: 'Payouts',
    title: 'Collector payout system',
    tags: ['payouts', 'stripe', 'money', 'collectors'],
    content: `## How payouts work

Mosaic uses Stripe Connect to pay collectors directly to their bank accounts.

## For collectors

1. Connect your bank account in the Mosaic app (Profile → Payouts)
2. Earnings accumulate as tasks are scored
3. Request a withdrawal from the Earnings screen
4. Funds arrive within 2–5 business days

## Payout schedule

- Payouts are processed in batches weekly (every Monday)
- Minimum withdrawal: £10
- Mosaic takes a 15% platform fee on each submission

## For enterprise customers

You are billed monthly based on campaign activity. Invoices are available in Settings → Billing.`,
  },
  {
    id: 'webhooks-setup',
    category: 'Integrations',
    title: 'Setting up webhooks',
    tags: ['webhooks', 'api', 'integration', 'events'],
    content: `## Webhooks

Webhooks let you receive real-time notifications when events happen in Mosaic.

## Setting up a webhook

1. Go to **Settings → Webhooks**
2. Click **Add Webhook**
3. Enter your endpoint URL
4. Select the events you want to receive
5. Copy the signing secret for verification

## Events

- \`submission.created\` — A new photo was submitted
- \`submission.scored\` — AI scoring completed
- \`alert.created\` — Compliance score below threshold
- \`payout.processed\` — Collector payout completed
- \`campaign.activated\` — Campaign went live

## Verifying signatures

Every webhook is signed with HMAC-SHA256. Verify using your signing secret:
\`\`\`
X-Mosaic-Signature: sha256=<hmac>
\`\`\``,
  },
  {
    id: 'api-authentication',
    category: 'API',
    title: 'API Authentication',
    tags: ['api', 'auth', 'keys', 'token'],
    content: `## API Keys

Mosaic provides a REST API for integrating compliance data into your own systems.

## Getting an API key

1. Go to **Settings → API Keys**
2. Click **Generate New Key**
3. Copy the key — it won't be shown again

## Using the API

Include your API key in the Authorization header:
\`\`\`
Authorization: Bearer mk_live_xxxxxxxxxxxx
\`\`\`

## Rate limits

- **Standard plan**: 100 requests/minute
- **Enterprise plan**: 1000 requests/minute

Exceeded limits return \`429 Too Many Requests\`.

## Base URL

\`\`\`
https://your-domain.vercel.app/api/v1
\`\`\`

See the full [API Documentation](/api-docs) for all endpoints.`,
  },
  {
    id: 'gallery-filters',
    category: 'Gallery',
    title: 'Using the photo gallery',
    tags: ['gallery', 'photos', 'filter', 'search'],
    content: `## Gallery

The Gallery shows all submitted photos with their AI compliance scores.

## Filters

- **Campaign** — Filter by specific campaign
- **Store** — Filter by store name
- **Score range** — Dual-slider to filter by compliance score
- **Date range** — Filter by submission date
- **Sort** — Sort by newest, oldest, highest score, or lowest score

## Compare mode

Select two photos and click **Compare** to use the side-by-side slider comparison. Drag the divider to reveal differences between submissions.

## Re-scoring

Click the **Re-score** button on any submission to re-run AI analysis. Useful after updating compliance rules.`,
  },
  {
    id: 'alerts-management',
    category: 'Alerts',
    title: 'Managing compliance alerts',
    tags: ['alerts', 'notifications', 'threshold'],
    content: `## Compliance Alerts

Alerts are automatically created when a submission scores below the campaign's compliance threshold.

## Alert feed

View all alerts on the **Alerts** page, filterable by campaign, severity, and status.

## Notification channels

Configure where alerts are sent:
- **In-app** — Always shown in the alert feed
- **Email** — Configure in Settings → Notifications
- **Slack** — Configure in Settings → Slack

## Resolving alerts

Click an alert to view the submission, then mark as **Resolved** with optional notes. Resolved alerts are archived but searchable.`,
  },
];

export function searchArticles(query: string): Article[] {
  if (!query.trim()) return ARTICLES;
  const q = query.toLowerCase();
  return ARTICLES.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.content.toLowerCase().includes(q) ||
    a.tags.some(t => t.includes(q)) ||
    a.category.toLowerCase().includes(q)
  );
}

export const CATEGORIES = [...new Set(ARTICLES.map(a => a.category))];
