import { supabase } from '../supabase.js'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebaseConfig'

const CATEGORIES = ['Plumbing', 'Electrician', 'Carpenter', 'Cleaning', 'Painting', 'HVAC', 'Roofing', 'Landscaping']

function mapFreelancerRow(row) {
  return {
    uid: row.firebase_uid,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email,
    bio: row.bio,
    phone: row.phone,
    photoURL: row.photo_url,
    averageRating: row.average_rating,
    totalReviews: row.total_reviews,
    verified: row.verified,
    updatedAt: row.updated_at,
    categories: row.freelancer_categories?.map((cat) => cat.category) || [],
    idImageUrl: row.id_image_url || null,
    idVerificationStatus: row.id_verification_status || null,
  }
}

export const freelancerService = {
  CATEGORIES,

  async saveProfile(uid, data) {
    const { error } = await supabase.from('freelancers').upsert({
      firebase_uid: uid,
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      email: data.email,
      phone: data.phone || null,
      bio: data.bio || null,
      photo_url: data.photoURL || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'firebase_uid' })
    if (error) throw error

    if (Array.isArray(data.categories)) {
      await supabase.from('freelancer_categories').delete().eq('freelancer_id', uid)
      if (data.categories.length > 0) {
        const { error: catError } = await supabase.from('freelancer_categories').insert(
          data.categories.map((category) => ({ freelancer_id: uid, category }))
        )
        if (catError) throw catError
      }
    }
  },

  async getProfile(uid) {
    const { data, error } = await supabase
      .from('freelancers')
      .select('*, freelancer_categories(category)')
      .eq('firebase_uid', uid)
      .maybeSingle()
    if (error) throw error
    return data ? mapFreelancerRow(data) : null
  },

  async getAllFreelancers() {
    const { data, error } = await supabase
      .from('freelancers')
      .select('*, freelancer_categories(category)')
    if (error) throw error
    return data.map(mapFreelancerRow)
  },

  async getFreelancersByCategory(category) {
    const { data: categories, error: categoriesError } = await supabase
      .from('freelancer_categories')
      .select('freelancer_id')
      .eq('category', category)
    if (categoriesError) throw categoriesError

    const ids = categories.map((item) => item.freelancer_id)
    if (ids.length === 0) return []

    const { data, error } = await supabase
      .from('freelancers')
      .select('*, freelancer_categories(category)')
      .in('firebase_uid', ids)
    if (error) throw error
    return data.map(mapFreelancerRow)
  },

  async setVerified(uid, verified) {
    const { error } = await supabase
      .from('freelancers')
      .update({ verified })
      .eq('firebase_uid', uid)
    if (error) throw error
  },

  async uploadProfilePhoto(uid, file) {
    const storageRef = ref(storage, `profile-photos/${uid}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    const { error } = await supabase
      .from('freelancers')
      .update({ photo_url: url })
      .eq('firebase_uid', uid)
    if (error) throw error
    return url
  },
}
