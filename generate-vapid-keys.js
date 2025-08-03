const webpush = require('web-push');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys Generated:');
console.log('===================');
console.log('');
console.log('Add these to your .env.local file:');
console.log('');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('');
console.log('Also add to Vercel environment variables:');
console.log('- NEXT_PUBLIC_VAPID_PUBLIC_KEY (public key)');
console.log('- VAPID_PRIVATE_KEY (private key - keep secret!)');
console.log('');
console.log('Public Key (for client-side):');
console.log(vapidKeys.publicKey);
console.log('');
console.log('Private Key (for server-side - keep secret!):');
console.log(vapidKeys.privateKey);