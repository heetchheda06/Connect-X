import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './env.js';

let firebaseApp = null;

export const initFirebaseAdmin = () => {
  // Guard against re-initialization on hot reloads
  if (getApps().length > 0) {
    firebaseApp = getApp();
    return firebaseApp;
  }

  // Option 1: Base64-encoded Service Account JSON (ideal for Render/cloud hosts)
  if (env.firebaseServiceAccountBase64) {
    try {
      const decodedJson = Buffer.from(env.firebaseServiceAccountBase64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(decodedJson);
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || env.firebaseProjectId,
      });
      console.log('🔥 [Firebase Admin] Initialized with Base64 Service Account cert');
      return firebaseApp;
    } catch (err) {
      console.error('❌ [Firebase Admin] Failed to parse Base64 Service Account:', err.message);
    }
  }

  // Option 2: Individual Service Account credentials in environment variables
  if (env.firebaseClientEmail && env.firebasePrivateKey) {
    try {
      // Replace escaped "\\n" with real newlines
      const privateKey = env.firebasePrivateKey.replace(/\\n/g, '\n');
      firebaseApp = initializeApp({
        credential: cert({
          projectId: env.firebaseProjectId,
          clientEmail: env.firebaseClientEmail,
          privateKey,
        }),
        projectId: env.firebaseProjectId,
      });
      console.log('🔥 [Firebase Admin] Initialized with Service Account environment credentials');
      return firebaseApp;
    } catch (err) {
      console.error('❌ [Firebase Admin] Failed to initialize with cert credentials:', err.message);
    }
  }

  // Option 3: Project ID verification using Google public x509 certs
  // (Works when GCP organization policies disable service account key downloads)
  if (env.firebaseProjectId) {
    firebaseApp = initializeApp({
      projectId: env.firebaseProjectId,
    });
    console.log(`🔥 [Firebase Admin] Initialized with Project ID: ${env.firebaseProjectId} (Google Public Certs mode)`);
    return firebaseApp;
  }

  console.warn('⚠️ [Firebase Admin] No Firebase credentials or Project ID found. Google Auth verification will fail.');
  return null;
};

/**
 * Verifies a Firebase ID token sent from the client.
 * Returns the decoded token claims if valid.
 */
export const verifyFirebaseIdToken = async (idToken, checkRevoked = false) => {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('ID token is required and must be a string');
  }

  if (!firebaseApp && getApps().length === 0) {
    initFirebaseAdmin();
  }

  const app = firebaseApp || getApp();
  return await getAuth(app).verifyIdToken(idToken, checkRevoked);
};

export default {
  initFirebaseAdmin,
  verifyFirebaseIdToken,
};
