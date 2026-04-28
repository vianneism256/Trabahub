import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebaseConfig'

export const conversationService = {

async createConversation(jobId, jobTitle, freelancerId, freelancerName, customerId, firstMessage) {
    // Check if conversation already exists for this job + freelancer
    const q = query(
      collection(db, 'conversations'),
      where('jobId', '==', jobId),
      where('freelancerId', '==', freelancerId)
    )
    const existing = await getDocs(q)
    if (!existing.empty) return existing.docs[0].id

    // Create the conversation
    const convRef = await addDoc(collection(db, 'conversations'), {
      jobId,
      jobTitle,
      freelancerId,
      freelancerName,
      customerId,
      status: 'pending', // pending | accepted | declined | closed
      lastMessage: firstMessage,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
    })

    // Add the first message as a subcollection
    await addDoc(collection(db, 'conversations', convRef.id, 'messages'), {
      senderId: freelancerId,
      text: firstMessage,
      createdAt: serverTimestamp(),
    })

    return convRef.id
  },

  // Get all conversations for a freelancer
  async getConversationsByFreelancer(freelancerId) {
    const q = query(
      collection(db, 'conversations'),
      where('freelancerId', '==', freelancerId)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
  },

  // Get all conversations for a customer
  async getConversationsByCustomer(customerId) {
    const q = query(
      collection(db, 'conversations'),
      where('customerId', '==', customerId)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
  },

  // Send a message inside a conversation
  async sendMessage(conversationId, senderId, text) {
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      senderId,
      text,
      createdAt: serverTimestamp(),
    })
    // Update last message preview on the conversation
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: text,
      lastMessageAt: Date.now(),
    })
  },

  // Real-time listener for messages inside a conversation
  listenToMessages(conversationId, callback) {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, (snap) => {
      const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      callback(messages)
    })
  },

  // Customer accepts/declines a conversation request
  async updateStatus(conversationId, status) {
    await updateDoc(doc(db, 'conversations', conversationId), { status })
  },

  // Close all conversations for a job (when job is filled)
  async closeConversationsByJob(jobId) {
    const q = query(collection(db, 'conversations'), where('jobId', '==', jobId))
    const snap = await getDocs(q)
    const updates = snap.docs.map((d) => 
      updateDoc(doc(db, 'conversations', d.id), { status: 'closed' })
    )
    await Promise.all(updates)
  },

  listenToFreelancerConversations(freelancerId, callback) {
    const q = query(
      collection(db, 'conversations'),
      where('freelancerId', '==', freelancerId)
    )
    return onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      callback(data)
    })
  },

  listenToCustomerConversations(customerId, callback) {
    const q = query(
      collection(db, 'conversations'),
      where('customerId', '==', customerId)
    )
    return onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      callback(data)
    })
  },

  async deleteConversation(jobId, freelancerId) {
    const q = query(
      collection(db, 'conversations'),
      where('jobId', '==', jobId),
      where('freelancerId', '==', freelancerId)
    )
    const snap = await getDocs(q)
    const deletes = snap.docs.map((d) => deleteDoc(doc(db, 'conversations', d.id)))
    await Promise.all(deletes)
  },
}