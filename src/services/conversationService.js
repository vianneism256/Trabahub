import { supabase } from '../supabase.js'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebaseConfig'
import { notificationService } from './notificationService.js'

function mapConversationRow(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    freelancerId: row.freelancer_id,
    customerId: row.customer_id,
    freelancerName: row.freelancer_name,
    customerName: row.customer_name,
    freelancerPhoto: row.freelancer_photo,
    customerPhoto: row.customer_photo,
    status: row.status,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
  }
}

function mapMessageRow(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    text: row.text,
    file: row.file || null,
    createdAt: row.created_at,
  }
}

export const conversationService = {
  async createConversation(jobId, jobTitle, freelancerId, freelancerName, freelancerPhoto, customerId, customerName, customerPhoto, firstMessage) {
    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select('id')
      .eq('job_id', jobId)
      .eq('freelancer_id', freelancerId)
      .maybeSingle()

    if (existingError) throw existingError
    if (existing?.id) return existing.id

    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({
        job_id: jobId,
        job_title: jobTitle,
        freelancer_id: freelancerId,
        freelancer_name: freelancerName,
        freelancer_photo: freelancerPhoto || null,
        customer_id: customerId,
        customer_name: customerName || 'Customer',
        customer_photo: customerPhoto || null,
        status: 'pending',
        last_message: firstMessage,
        last_message_at: Date.now(),
        created_at: Date.now(),
      })
      .select('id')
      .single()

    if (createError) throw createError

    await supabase.from('messages').insert({
      conversation_id: created.id,
      sender_id: freelancerId,
      text: firstMessage,
      created_at: Date.now(),
    })

    return created.id
  },

  async getConversationsByFreelancer(freelancerId) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('freelancer_id', freelancerId)
    if (error) throw error
    return data
      .map(mapConversationRow)
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
  },

  async getConversationsByCustomer(customerId) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customerId)
    if (error) throw error
    return data
      .map(mapConversationRow)
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
  },

  async sendMessage(conversationId, senderId, text) {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      text,
      created_at: Date.now(),
    })
    const { error } = await supabase
      .from('conversations')
      .update({
        last_message: text,
        last_message_at: Date.now(),
      })
      .eq('id', conversationId)
    if (error) throw error
  },

  listenToMessages(conversationId, callback) {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) {
        console.error(error)
        return
      }
      callback(data.map(mapMessageRow))
    }

    fetchMessages()

    const channel = supabase
      .channel(`messages-${conversationId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async () => {
          await fetchMessages()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  },

  async updateStatus(conversationId, status) {
    const { error } = await supabase
      .from('conversations')
      .update({ status })
      .eq('id', conversationId)
    if (error) throw error

    if (status === 'accepted' || status === 'declined') {
      const { data: conv } = await supabase
        .from('conversations')
        .select('freelancer_id, job_title')
        .eq('id', conversationId)
        .single()

      if (conv) {
        const isAccepted = status === 'accepted'
        await notificationService.createNotification(
          conv.freelancer_id,
          isAccepted ? 'application_accepted' : 'application_declined',
          isAccepted ? 'Application Accepted!' : 'Application Declined',
          isAccepted
            ? `Your application for "${conv.job_title}" has been accepted. You got the job!`
            : `Your application for "${conv.job_title}" was not selected this time.`
        )
      }
    }
  },

  async closeConversationsByJob(jobId) {
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'closed' })
      .eq('job_id', jobId)
    if (error) throw error
  },

  listenToFreelancerConversations(freelancerId, callback) {
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('freelancer_id', freelancerId)
      if (error) {
        console.error(error)
        return
      }
      callback(
        data
          .map(mapConversationRow)
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      )
    }

    fetchConversations()

    const channel = supabase
      .channel(`conversations-freelancer-${freelancerId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `freelancer_id=eq.${freelancerId}` },
        async () => {
          await fetchConversations()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  },

  listenToCustomerConversations(customerId, callback) {
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_id', customerId)
      if (error) {
        console.error(error)
        return
      }
      callback(
        data
          .map(mapConversationRow)
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      )
    }

    fetchConversations()

    const channel = supabase
      .channel(`conversations-customer-${customerId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `customer_id=eq.${customerId}` },
        async () => {
          await fetchConversations()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  },

  async deleteConversation(jobId, freelancerId) {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('job_id', jobId)
      .eq('freelancer_id', freelancerId)
    if (error) throw error
  },

  async uploadMessageFile(conversationId, senderId, file) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PNG, JPG, GIF images and PDFs are allowed')
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('File must be under 10MB')
    }

    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const storageRef = ref(storage, `messages/${conversationId}/${filename}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)

    return {
      name: file.name,
      type: file.type,
      url,
      size: file.size,
    }
  },

  async sendMessageWithFile(conversationId, senderId, text, fileData) {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      text: text || '',
      file: fileData,
      created_at: Date.now(),
    })
    const preview = fileData.name ? `📎 ${fileData.name}` : text || '[File]'
    const { error } = await supabase
      .from('conversations')
      .update({
        last_message: preview,
        last_message_at: Date.now(),
      })
      .eq('id', conversationId)
    if (error) throw error
  },
}
