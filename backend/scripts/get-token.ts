import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'br-project-481607',
  });
}

const uid = '6LPoza5laJhyPKyMO99vE6Ol1EI2';

async function main() {
  // Get user info
  try {
    const user = await admin.auth().getUser(uid);
    console.log('User info:');
    console.log('- UID:', user.uid);
    console.log('- Email:', user.email);
    console.log('- Custom Claims:', JSON.stringify(user.customClaims) || 'none');
    console.log('- Email Verified:', user.emailVerified);
  } catch (e: any) {
    console.log('User not found or error:', e.message);
  }
  
  // Create a custom token (for testing)
  const customToken = await admin.auth().createCustomToken(uid);
  console.log('\nCustom Token (échange contre un ID token):');
  console.log(customToken);
  
  process.exit(0);
}

main();
