import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebaseConfig'
import { supabase } from '../supabase.js'

export const customerService = {
  async saveProfile(uid, data) {
    const payload = {
      firebase_uid: uid,
      ...data,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('customers').upsert(payload, { onConflict: 'firebase_uid' })
    if (error) throw error
  },

  async getProfile(uid) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('firebase_uid', uid)
      .maybeSingle()
    if (error) throw error
    return data || null
  },

  async uploadProfilePhoto(uid, file) {
    const storageRef = ref(storage, `customer-photos/${uid}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    const { error } = await supabase
      .from('customers')
      .update({ photo_url: url })
      .eq('firebase_uid', uid)
    if (error) throw error
    return url
  },
}