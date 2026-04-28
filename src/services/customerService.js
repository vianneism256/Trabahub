import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebaseConfig'

export const customerService = {
  async saveProfile(uid, data) {
    const ref = doc(db, 'customers', uid)
    await setDoc(ref, {
      uid,
      ...data,
      updatedAt: Date.now(),
    }, { merge: true })
  },

  async getProfile(uid) {
    const ref = doc(db, 'customers', uid)
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : null
  },

  async uploadProfilePhoto(uid, file) {
    const storageRef = ref(storage, `customer-photos/${uid}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    await updateDoc(doc(db, 'customers', uid), { photoURL: url })
    return url
  },
}