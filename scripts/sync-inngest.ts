import 'dotenv/config';

const eventKey = process.env.INNGEST_EVENT_KEY;
const signingKey = process.env.INNGEST_SIGNING_KEY;
const url = process.env.PUBLIC_URL || 'https://cerevex.store/api/inngest';

if (!eventKey || !signingKey) {
  console.log('Set INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY in env');
}
console.log('Sync command:');
console.log(`INNGEST_EVENT_KEY=${eventKey || 'xxx'} INNGEST_SIGNING_KEY=${signingKey || 'xxx'} npx inngest-cli@latest sync --url ${url}`);
console.log('Or use dashboard sync to', url);
