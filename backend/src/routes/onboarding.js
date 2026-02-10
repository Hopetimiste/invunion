import { Router } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { validate } from '../middleware/validate.js';
import { signupTenantSchema } from '../validators/onboarding.js';

const router = Router();

// ATTENTION : On ne déclare plus db et auth ici pour éviter le crash au démarrage

router.post('/signup-tenant', validate(signupTenantSchema), async (req, res) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    // --- C'EST ICI QU'ON INITIALISE MAINTENANT ---
    // À ce moment là, le serveur a démarré, donc Firebase est prêt.
    const auth = getAuth();
    const db = getFirestore(undefined, 'bdd-firestore-tenant-user');
    // ---------------------------------------------

    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    // req.body est maintenant validé et transformé par Zod (trim, etc.)
    const { companyName, firstName } = req.body;

    const tenantRef = await db.collection('tenants').add({
      name: companyName,
      ownerId: uid,
      createdAt: FieldValue.serverTimestamp(),
      plan: 'free'
    });

    await db.collection('users').doc(uid).set({
      email: email,
      tenantId: tenantRef.id,
      role: 'admin', 
      firstName: firstName || '',
      createdAt: FieldValue.serverTimestamp()
    });

    await auth.setCustomUserClaims(uid, {
      tenantId: tenantRef.id,
      role: 'admin'
    });

    console.log(`New tenant created: ${tenantRef.id} for user ${uid}`);

    res.status(200).json({ 
      success: true, 
      tenantId: tenantRef.id, 
      message: "Tenant initialized successfully" 
    });

  } catch (error) {
    console.error('Onboarding Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;