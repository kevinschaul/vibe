# Integration Tests

These tests make **real API calls** to Bluesky, Mastodon, X (Twitter), and your blog.
They are skipped automatically unless you provide credentials via environment variables.

## Setup

Copy `.env.test.local.example` to `.env.test.local` and fill in your credentials:

```
cp .env.test.local.example .env.test.local
```

Then run the integration tests:

```bash
npm run test:integration
```

## Getting credentials

### Bluesky
1. Log in to [bsky.app](https://bsky.app)
2. Go to **Settings → App Passwords**
3. Create a new app password named `vibe-test`
4. Set `BLUESKY_TEST_HANDLE` and `BLUESKY_TEST_APP_PASSWORD`

### Mastodon
1. Log in to your Mastodon instance
2. Go to **Settings → Development → New Application**
3. Name it `vibe-test`, grant `read` + `write:statuses` + `write:media`
4. Copy the access token
5. Set `MASTODON_TEST_INSTANCE` and `MASTODON_TEST_ACCESS_TOKEN`

### X (Twitter)
1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Create a project and app with **Read and Write** permissions
3. Copy Bearer Token, API Key/Secret, and Access Token/Secret
4. Set all `TWITTER_TEST_*` variables

### Blog (WordPress)
1. Go to **Users → Your Profile → Application Passwords**
2. Create a new application password named `vibe-test`
3. Set `WP_TEST_URL`, `WP_TEST_USERNAME`, `WP_TEST_APP_PASSWORD`

## ⚠️ Warning

The post integration tests (`INTEGRATION_POST=true`) will **actually publish** content
to your accounts. Test posts are clearly prefixed with `[VIBE TEST]`. Delete them manually afterward.
