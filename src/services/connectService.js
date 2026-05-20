import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebaseConfig'
import { supabase } from '../supabase.js'

const PACKAGES = [
  { id: 1, connects: 10, price: 99, label: 'Starter' },
  { id: 2, connects: 30, price: 249, label: 'Basic', popular: true },
  { id: 3, connects: 60, price: 449, label: 'Pro' },
  { id: 4, connects: 100, price: 699, label: 'Power' },
]

const COSTS = { apply: 6, postJob: 4 }

export const connectService = {
  PACKAGES,
  COSTS,

  async getBalance(uid, role) {
    const table = role === 'freelancer' ? 'freelancers' : 'customers'
    const { data, error } = await supabase
      .from(table)
      .select('connects')
      .eq('firebase_uid', uid)
      .maybeSingle()
    if (error) throw error
    return data?.connects ?? 0
  },

  async deductConnects(uid, role, amount) {
    const balance = await this.getBalance(uid, role)
    if (balance < amount) throw new Error(`Not enough connects. You need ${amount} but have ${balance}.`)
    const table = role === 'freelancer' ? 'freelancers' : 'customers'
    const { error } = await supabase
      .from(table)
      .update({ connects: balance - amount })
      .eq('firebase_uid', uid)
    if (error) throw error
    return balance - amount
  },

  async uploadReceipt(uid, file) {
    const storageRef = ref(storage, `connect-receipts/${uid}/${Date.now()}-${file.name}`)
    await uploadBytes(storageRef, file)
    return await getDownloadURL(storageRef)
  },

  async submitPurchase(uid, role, packageConnects, packagePrice, receiptFile) {
    const receiptUrl = await this.uploadReceipt(uid, receiptFile)
    const { error } = await supabase.from('connect_purchases').insert({
      user_id: uid,
      user_role: role,
      package_connects: packageConnects,
      package_price: packagePrice,
      receipt_url: receiptUrl,
      status: 'pending',
    })
    if (error) throw error
  },

  async listenToPendingPurchases(callback) {
    const fetchAndEnrich = async () => {
      const { data: purchases } = await supabase
        .from('connect_purchases')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      const enriched = await Promise.all(
        (purchases || []).map(async (p) => {
          const table = p.user_role === 'freelancer' ? 'freelancers' : 'customers'
          const { data: profile } = await supabase
            .from(table)
            .select('first_name, last_name, email, photo_url')
            .eq('firebase_uid', p.user_id)
            .maybeSingle()
          return {
            ...p,
            firstName: profile?.first_name,
            lastName: profile?.last_name,
            email: profile?.email,
            photoUrl: profile?.photo_url,
          }
        })
      )

      callback(enriched)
    }

    fetchAndEnrich()

    const channel = supabase
      .channel('connect-purchases-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connect_purchases' }, fetchAndEnrich)
      .subscribe()

    return () => supabase.removeChannel(channel)
  },

  async approvePurchase(purchaseId, userId, userRole, packageConnects) {
    const { error: pe } = await supabase
      .from('connect_purchases')
      .update({ status: 'approved' })
      .eq('id', purchaseId)
    if (pe) throw pe

    const table = userRole === 'freelancer' ? 'freelancers' : 'customers'
    const { data: profile, error: fe } = await supabase
      .from(table)
      .select('connects')
      .eq('firebase_uid', userId)
      .maybeSingle()
    if (fe) throw fe

    const { error: ue } = await supabase
      .from(table)
      .update({ connects: (profile?.connects ?? 0) + packageConnects })
      .eq('firebase_uid', userId)
    if (ue) throw ue

    await supabase.from('notifications').insert({
      freelancer_id: userId,
      type: 'connects_approved',
      title: 'Connects Purchase Approved!',
      message: `Your GCash payment was verified. ${packageConnects} connects have been added to your account.`,
      is_read: false,
    })
  },

  async rejectPurchase(purchaseId, userId, reason) {
    const { error: pe } = await supabase
      .from('connect_purchases')
      .update({ status: 'rejected' })
      .eq('id', purchaseId)
    if (pe) throw pe

    await supabase.from('notifications').insert({
      freelancer_id: userId,
      type: 'connects_rejected',
      title: 'Connect Purchase Rejected',
      message: reason || 'Your payment receipt could not be verified. Please contact support.',
      is_read: false,
    })
  },
}
