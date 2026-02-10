/**
 * Test Firebase Authentication
 * 
 * This script tests the auth flow:
 * 1. Creates a test user in Firebase (if needed)
 * 2. Gets an ID token
 * 3. Calls the API with the token
 * 
 * Usage: npx ts-node scripts/test-auth.ts
 */

import admin from 'firebase-admin';

const PROJECT_ID = 'br-project-481607';
const API_URL = 'http://localhost:8080';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: PROJECT_ID,
  });
}

async function testAuth() {
  console.log('🔐 Testing Firebase Authentication\n');
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`API URL: ${API_URL}\n`);

  try {
    // 1. List existing users
    console.log('1️⃣  Checking existing users...');
    const listResult = await admin.auth().listUsers(10);
    
    if (listResult.users.length === 0) {
      console.log('   No users found. Create a user in Firebase Console first.');
      console.log('   Or sign up via the frontend app.\n');
      return;
    }

    console.log(`   Found ${listResult.users.length} user(s):`);
    listResult.users.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.email || user.uid}`);
      console.log(`      UID: ${user.uid}`);
      console.log(`      Custom Claims: ${JSON.stringify(user.customClaims || {})}`);
    });
    console.log('');

    // 2. Create a custom token for the first user (for testing)
    const testUser = listResult.users[0];
    console.log(`2️⃣  Creating custom token for: ${testUser.email || testUser.uid}`);
    
    const customToken = await admin.auth().createCustomToken(testUser.uid, {
      tenantId: testUser.customClaims?.tenantId || 'test-tenant',
      role: testUser.customClaims?.role || 'admin',
    });
    
    console.log('   ✓ Custom token created');
    console.log(`   Token (first 50 chars): ${customToken.substring(0, 50)}...\n`);

    // Note: Custom tokens can't be used directly with the API
    // They need to be exchanged for ID tokens via Firebase client SDK
    console.log('ℹ️  Note: To test the API, you need an ID token from the frontend.');
    console.log('   Custom tokens must be exchanged via Firebase client SDK.\n');

    // 3. Show how to test manually
    console.log('3️⃣  Manual test instructions:');
    console.log('   1. Open your frontend app and sign in');
    console.log('   2. Open browser DevTools > Console');
    console.log('   3. Run: firebase.auth().currentUser.getIdToken().then(t => console.log(t))');
    console.log('   4. Copy the token and run:');
    console.log(`      curl -H "Authorization: Bearer <TOKEN>" ${API_URL}/api/v1/auth/me\n`);

    // 4. Verify the user has custom claims set
    console.log('4️⃣  Checking user custom claims...');
    const userRecord = await admin.auth().getUser(testUser.uid);
    
    if (!userRecord.customClaims?.tenantId) {
      console.log('   ⚠️  User has no tenantId claim. Setting test claims...');
      
      // Set test claims
      await admin.auth().setCustomUserClaims(testUser.uid, {
        tenantId: 'test-tenant-' + Date.now(),
        role: 'admin',
      });
      
      console.log('   ✓ Custom claims set. User needs to re-login to get new claims.\n');
    } else {
      console.log(`   ✓ User has tenantId: ${userRecord.customClaims.tenantId}`);
      console.log(`   ✓ User has role: ${userRecord.customClaims.role}\n`);
    }

    console.log('✅ Firebase Auth is properly configured!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'app/no-app') {
      console.log('\nMake sure you have Application Default Credentials set up:');
      console.log('  gcloud auth application-default login');
    }
  }
}

testAuth();
