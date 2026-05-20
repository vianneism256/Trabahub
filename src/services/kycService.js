import { supabase } from '../supabase.js'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebaseConfig'
import { notificationService } from './notificationService.js'

export const kycService = {
  async uploadIdImage(uid, role, file) {
    const storageRef = ref(storage, `kyc/${role}/${uid}/government-id`)
    await uploadBytes(storageRef, file)
    return await getDownloadURL(storageRef)
  },

  async submitIdVerification(uid, role, imageUrl) {
    const table = role === 'freelancer' ? 'freelancers' : 'customers'
    const { error } = await supabase
      .from(table)
      .update({ id_image_url: imageUrl, id_verification_status: 'pending' })
      .eq('firebase_uid', uid)
    if (error) throw error
  },

  async getPendingKycSubmissions() {
    const [{ data: freelancers, error: fErr }, { data: customers, error: cErr }] = await Promise.all([
      supabase
        .from('freelancers')
        .select('firebase_uid, first_name, last_name, email, photo_url, id_image_url')
        .eq('id_verification_status', 'pending'),
      supabase
        .from('customers')
        .select('firebase_uid, first_name, last_name, email, photo_url, id_image_url')
        .eq('id_verification_status', 'pending'),
    ])
    if (fErr) throw fErr
    if (cErr) throw cErr

    return [
      ...(freelancers || []).map(r => ({
        uid: r.firebase_uid,
        firstName: r.first_name || '',
        lastName: r.last_name || '',
        email: r.email,
        photoUrl: r.photo_url,
        idImageUrl: r.id_image_url,
        role: 'freelancer',
      })),
      ...(customers || []).map(r => ({
        uid: r.firebase_uid,
        firstName: r.first_name || '',
        lastName: r.last_name || '',
        email: r.email,
        photoUrl: r.photo_url,
        idImageUrl: r.id_image_url,
        role: 'customer',
      })),
    ]
  },

  async verifyKyc(uid, role) {
    const table = role === 'freelancer' ? 'freelancers' : 'customers'
    const { error } = await supabase
      .from(table)
      .update({ id_verification_status: 'verified' })
      .eq('firebase_uid', uid)
    if (error) throw error

    if (role === 'freelancer') {
      await notificationService.createNotification(
        uid,
        'kyc_verified',
        'Identity Verified',
        'Your government ID has been verified. You can now access job listings and submit certifications.'
      )
    }
  },

  async rejectKyc(uid, role, reason) {
    const table = role === 'freelancer' ? 'freelancers' : 'customers'
    const { error } = await supabase
      .from(table)
      .update({ id_verification_status: 'rejected' })
      .eq('firebase_uid', uid)
    if (error) throw error

    if (role === 'freelancer') {
      await notificationService.createNotification(
        uid,
        'kyc_rejected',
        'Identity Verification Failed',
        `Your government ID was not accepted${reason ? `: ${reason}` : '. Please re-upload a clearer image.'}`
      )
    }
  },

  listenToPendingKyc(callback) {
    const fetch = async () => {
      const submissions = await this.getPendingKycSubmissions()
      callback(submissions)
    }
    fetch()

    const channel = supabase
      .channel('kyc-pending-combined')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freelancers' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetch)
      .subscribe()

    return () => supabase.removeChannel(channel)
  },
}
