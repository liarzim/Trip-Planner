import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { Platform } from 'react-native';
import { auth } from '../config/firebaseConfig';

/**
 * Registers a new user with email, password, and display name.
 */
export const registerUser = async (
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential;
};

/**
 * Logs in an existing user with email and password.
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Signs in a user using Google Authentication.
 * Uses web popups when running on the web, and throws an instruction error on native mobile.
 */
export const loginWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  if (Platform.OS === 'web') {
    return signInWithPopup(auth, provider);
  } else {
    throw new Error('Google Sign-In on mobile devices requires configuring native client IDs.');
  }
};
