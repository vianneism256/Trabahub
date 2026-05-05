import { supabase } from '../supabase.js'

export const notificationService = {
  async createNotification(freelancerId, type, title, message) {
    const { error } = await supabase.from('notifications').insert({
      freelancer_id: freelancerId,
      type,
      title,
      message,
      is_read: false,
    })
    if (error) throw error
  },

  async getNotifications(freelancerId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map((row) => ({
      id: row.id,
      freelancerId: row.freelancer_id,
      type: row.type,
      title: row.title,
      message: row.message,
      isRead: row.is_read,
      createdAt: row.created_at,
    }))
  },

  async markAsRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    if (error) throw error
  },

  async markAllAsRead(freelancerId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('freelancer_id', freelancerId)
      .eq('is_read', false)
    if (error) throw error
  },

  listenToNotifications(freelancerId, callback) {
    const fetchNotifications = async () => {
      const notifs = await this.getNotifications(freelancerId)
      callback(notifs)
    }

    fetchNotifications()

    const channel = supabase
      .channel(`notifications-${freelancerId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `freelancer_id=eq.${freelancerId}` },
        async () => {
          await fetchNotifications()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  },
}
