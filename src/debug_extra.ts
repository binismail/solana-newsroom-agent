import axios from 'axios';

// Finalized devnet transaction signature we already paid
const signature = '5NtR3PKNKMDeaKpsA3FrAgJyeGKQUweV3cGH58gZmk3dBoqYfm1DqfxpuY8QyV3UwjEzX4tVzyNyqeXHFEiunpZ5';

async function testEnvelope(testName: string, envelopeModifications: Record<string, any>) {
  const url = 'https://api.acedata.cloud/webextrator/extract';
  const data = {
    url: 'https://solana.com/news',
    enableLlm: true,
    expectedType: 'article'
  };

  const envelope = {
    x402Version: 2,
    scheme: 'exact',
    network: 'solana',
    payload: { signature },
    ...envelopeModifications
  };

  const xPayment = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
  console.log(`\nTesting: "${testName}"`);
  console.log(`Envelope: ${JSON.stringify(envelope)}`);

  try {
    const res = await axios.post(url, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'acedatacloud-node/0.1.0',
        'X-Payment': xPayment
      },
      timeout: 15000 // 15 seconds
    });
    console.log(`-> SUCCESS! Data:`, JSON.stringify(res.data).slice(0, 200));
  } catch (err: any) {
    if (err.response) {
      console.log(`-> FAILED: Status ${err.response.status}`);
      console.log('   Body:', JSON.stringify(err.response.data));
    } else {
      console.log(`-> ERROR:`, err.message);
    }
  }
}

async function run() {
  await testEnvelope('Add extra with rpcUrl inside', {
    extra: {
      rpcUrl: 'https://api.devnet.solana.com'
    }
  });

  await testEnvelope('Add rpcUrl directly to envelope root', {
    rpcUrl: 'https://api.devnet.solana.com'
  });

  await testEnvelope('Add cluster parameter to envelope root', {
    cluster: 'devnet'
  });

  await testEnvelope('Add network="solana-devnet" (retest)', {
    network: 'solana-devnet'
  });
}

run().catch(console.error);
