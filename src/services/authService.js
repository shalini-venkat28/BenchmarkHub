/**
 * Firebase Auth service — restricted to @zeb.co email domain.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase'

const ALLOWED_DOMAIN = 'zeb.co'

export function validateZebEmail(email) {
  if (!email || !email.includes('@')) return false
  const domain = email.split('@')[1]?.toLowerCase()
  return domain === ALLOWED_DOMAIN
}

export async function signUp(email, password, displayName) {
  if (!validateZebEmail(email)) {
    throw new Error('Only @zeb.co email addresses are allowed to register.')
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(cred.user, { displayName })
  }
  return cred.user
}

export async function signIn(email, password) {
  if (!validateZebEmail(email)) {
    throw new Error('Only @zeb.co email addresses are allowed to sign in.')
  }
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function logOut() {
  await signOut(auth)
}

export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback)
}
