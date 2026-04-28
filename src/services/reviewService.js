import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebaseConfig'

export const reviewService = {
  async submitReview(freelancerId, customerId, jobId, jobTitle, rating, comment) {
    // Check if review already exists for this job
    const q = query(
      collection(db, 'reviews'),
      where('jobId', '==', jobId),
      where('customerId', '==', customerId)
    )
    const existing = await getDocs(q)
    if (!existing.empty) throw new Error('You already reviewed this job')

    // Add review
    await addDoc(collection(db, 'reviews'), {
      freelancerId,
      customerId,
      jobId,
      jobTitle,
      rating,
      comment,
      createdAt: Date.now(),
    })

    // Update freelancer average rating
    const allReviews = await getDocs(
      query(collection(db, 'reviews'), where('freelancerId', '==', freelancerId))
    )
    const ratings = allReviews.docs.map((d) => d.data().rating)
    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length

    await updateDoc(doc(db, 'freelancers', freelancerId), {
      averageRating: parseFloat(average.toFixed(1)),
      totalReviews: ratings.length,
    })
  },

  listenToFreelancerReviews(freelancerId, callback) {
    const q = query(
      collection(db, 'reviews'),
      where('freelancerId', '==', freelancerId)
    )
    return onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.createdAt - a.createdAt)
      callback(data)
    })
  },
}