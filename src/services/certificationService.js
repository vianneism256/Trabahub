import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { storage, db } from '../firebaseConfig'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export const certificationService = {
  // Upload certification image to Firebase Storage
  async uploadCertificationImage(freelancerId, file) {
    const timestamp = Date.now()
    const filename = `${freelancerId}-${timestamp}-${file.name}`
    const storageRef = ref(storage, `certifications/${freelancerId}/${filename}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    return url
  },

  // Add new certification to freelancer's profile
  async addCertification(freelancerId, certData) {
    const docRef = await addDoc(collection(db, 'certifications'), {
      freelancerId,
      title: certData.title,
      imageUrl: certData.imageUrl,
      status: 'pending',
      submittedAt: serverTimestamp(),
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null,
    })

    // Create edit log entry
    await this.createEditLog(freelancerId, 'certification_added', {
      certificationId: docRef.id,
      certificationTitle: certData.title,
      certificationImage: certData.imageUrl,
    })

    return docRef.id
  },

  // Get all certifications for a freelancer
  async getCertificationsByFreelancer(freelancerId) {
    const q = query(
      collection(db, 'certifications'),
      where('freelancerId', '==', freelancerId)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },

  // Get pending certifications for admin review
  async getPendingCertifications() {
    const q = query(
      collection(db, 'certifications'),
      where('status', '==', 'pending')
    )
    const snap = await getDocs(q)
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Fetch freelancer names
    const withFreelancerNames = await Promise.all(
      docs.map(async (cert) => {
        const freelancerRef = doc(db, 'freelancers', cert.freelancerId)
        const freelancerSnap = await getDocs(query(
          collection(db, 'freelancers'),
          where('uid', '==', cert.freelancerId)
        ))
        const freelancer = freelancerSnap.docs[0]?.data()
        return {
          ...cert,
          freelancerName: freelancer?.displayName || 'Unknown',
          freelancerPhoto: freelancer?.photoURL || null,
        }
      })
    )

    return withFreelancerNames
  },

  // Admin verifies a certification
  async verifyCertification(certificationId, adminUid) {
    await updateDoc(doc(db, 'certifications', certificationId), {
      status: 'verified',
      verifiedAt: serverTimestamp(),
      verifiedBy: adminUid,
    })
  },

  // Admin rejects a certification with reason
  async rejectCertification(certificationId, adminUid, reason) {
    await updateDoc(doc(db, 'certifications', certificationId), {
      status: 'rejected',
      verifiedAt: serverTimestamp(),
      verifiedBy: adminUid,
      rejectionReason: reason,
    })
  },

  // Create an edit log entry
  async createEditLog(freelancerId, changeType, details) {
    await addDoc(collection(db, 'editLogs'), {
      freelancerId,
      changeType, // 'certification_added', 'profile_updated', etc.
      details,
      createdAt: serverTimestamp(),
      status: 'pending', // pending, reviewed, approved
    })
  },

  // Get edit logs for a freelancer
  async getEditLogsByFreelancer(freelancerId) {
    const q = query(
      collection(db, 'editLogs'),
      where('freelancerId', '==', freelancerId)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },

  // Get all pending edit logs (for admin)
  async getPendingEditLogs() {
    const q = query(
      collection(db, 'editLogs'),
      where('status', '==', 'pending')
    )
    const snap = await getDocs(q)
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Fetch freelancer details
    const withFreelancerInfo = await Promise.all(
      docs.map(async (log) => {
        const freelancerSnap = await getDocs(query(
          collection(db, 'freelancers'),
          where('uid', '==', log.freelancerId)
        ))
        const freelancer = freelancerSnap.docs[0]?.data()
        return {
          ...log,
          freelancerName: freelancer?.displayName || 'Unknown',
          freelancerEmail: freelancer?.email || 'N/A',
          freelancerPhoto: freelancer?.photoURL || null,
        }
      })
    )

    return withFreelancerInfo
  },

  // Mark edit log as reviewed
  async markEditLogReviewed(logId) {
    await updateDoc(doc(db, 'editLogs', logId), {
      status: 'reviewed',
    })
  },

  // Real-time listener for all edit logs
  listenToPendingEditLogs(callback) {
    const q = query(
      collection(db, 'editLogs'),
      where('status', '==', 'pending')
    )
    return onSnapshot(q, async (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

      // Fetch freelancer details
      const withFreelancerInfo = await Promise.all(
        docs.map(async (log) => {
          const freelancerSnap = await getDocs(query(
            collection(db, 'freelancers'),
            where('uid', '==', log.freelancerId)
          ))
          const freelancer = freelancerSnap.docs[0]?.data()
          return {
            ...log,
            freelancerName: freelancer?.displayName || 'Unknown',
            freelancerEmail: freelancer?.email || 'N/A',
            freelancerPhoto: freelancer?.photoURL || null,
          }
        })
      )

      callback(withFreelancerInfo)
    })
  },

  // Get verified certifications for a freelancer (for public profile)
  async getVerifiedCertificationsByFreelancer(freelancerId) {
    const q = query(
      collection(db, 'certifications'),
      where('freelancerId', '==', freelancerId),
      where('status', '==', 'verified')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },
}
