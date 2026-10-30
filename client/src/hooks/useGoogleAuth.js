import { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { auth, googleProvider } from '../lib/firebase.js';
import { googleAuthApi } from '../api/auth.api.js';
import { useAuthStore } from '../store/authStore.js';

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setSession } = useAuthStore();

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Popup Google Sign-In with Firebase
      const result = await signInWithPopup(auth, googleProvider);
      
      // 2. Retrieve Firebase ID Token
      const idToken = await result.user.getIdToken();

      // 3. Authenticate with ConnectX backend
      const res = await googleAuthApi(idToken);

      if (res.success && res.data) {
        const { user, token, isNewUser } = res.data;

        // 4. Save ConnectX session to store & localStorage
        setSession(user, token, isNewUser);

        // 5. Sign out of Firebase immediately (ConnectX uses its own 7-day JWT)
        await signOut(auth).catch(() => {});

        return { success: true, user, isNewUser };
      }

      throw new Error(res.message || 'Google authentication failed');
    } catch (err) {
      // Handle Firebase Auth error codes gracefully
      const code = err.code || '';
      let friendlyMessage = null;

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User voluntarily dismissed popup
        setIsLoading(false);
        return { success: false, cancelled: true };
      } else if (code === 'auth/popup-blocked') {
        friendlyMessage = 'Popup was blocked by your browser. Please allow popups for ConnectX.';
      } else if (code === 'auth/unauthorized-domain') {
        friendlyMessage = 'This domain is not authorized in Firebase Console. Please add it under Authorized Domains.';
      } else {
        friendlyMessage = err.response?.data?.message || err.message || 'Google sign-in failed. Please try again.';
      }

      setError(friendlyMessage);
      toast.error(friendlyMessage);
      return { success: false, error: friendlyMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signInWithGoogle,
    isLoading,
    error,
  };
}

export default useGoogleAuth;
