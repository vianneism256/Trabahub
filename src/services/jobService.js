import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export const jobService = {
  async createJob(uid, data) {
    const ref = collection(db, 'jobs')
    const docRef = await addDoc(ref, {
      ...data,
      customerId: uid,
      status: 'open',
      applications: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return docRef.id
  },

  async getJobById(jobId) {
    const ref = doc(db, 'jobs', jobId)
    const snap = await getDoc(ref)
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  },

  async getJobsByCustomer(uid) {
    const q = query(collection(db, 'jobs'), where('customerId', '==', uid))
    const snap = await getDocs(q)
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  },

  async getJobsByCategory(category) {
    const q = query(
      collection(db, 'jobs'),
      where('status', '==', 'open'),
      where('categories', 'array-contains', category)
    )
    const snap = await getDocs(q)
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  },

  async getAllOpenJobs() {
    const q = query(collection(db, 'jobs'), where('status', '==', 'open'))
    const snap = await getDocs(q)
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.createdAt - a.createdAt)
  },

  async applyForJob(jobId, freelancerId, message) {
    const ref = doc(db, 'jobs', jobId)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const applications = snap.data().applications || []
      applications.push({
        freelancerId,
        message,
        appliedAt: Date.now(),
      })
      await updateDoc(ref, { applications, updatedAt: Date.now() })
    }
  },

  async updateJobStatus(jobId, status) {
    const ref = doc(db, 'jobs', jobId)
    await updateDoc(ref, { status, updatedAt: Date.now() })
  },

  async deleteJob(jobId) {
    const ref = doc(db, 'jobs', jobId)
    await deleteDoc(ref)
  },
}
