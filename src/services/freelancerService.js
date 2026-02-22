import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

const CATEGORIES = ['Plumbing', 'Electrician', 'Carpenter', 'Cleaning', 'Painting', 'HVAC', 'Roofing', 'Landscaping']

export const freelancerService = {
  CATEGORIES,

  async saveProfile(uid, data) {
    const ref = doc(db, 'freelancers', uid)
    await setDoc(ref, {
      uid,
      ...data,
      updatedAt: Date.now(),
    }, { merge: true })
  },

  async getProfile(uid) {
    const ref = doc(db, 'freelancers', uid)
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : null
  },

  async getAllFreelancers() {
    const q = query(collection(db, 'freelancers'))
    const snap = await getDocs(q)
    return snap.docs.map((doc) => doc.data())
  },

  async getFreelancersByCategory(category) {
    const q = query(
      collection(db, 'freelancers'),
      where('categories', 'array-contains', category)
    )
    const snap = await getDocs(q)
    return snap.docs.map((doc) => doc.data())
  },

  async setVerified(uid, verified) {
    const ref = doc(db, 'freelancers', uid)
    await updateDoc(ref, { verified })
  },
}
