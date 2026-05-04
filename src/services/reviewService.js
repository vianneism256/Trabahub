import { supabase } from '../supabase.js'

export const reviewService = {
  async submitReview(freelancerId, customerId, jobId, jobTitle, rating, comment) {
    const { data: existing, error: existingError } = await supabase
      .from('reviews')
      .select('id')
      .eq('job_id', jobId)
      .eq('customer_id', customerId)

    if (existingError) throw existingError
    if (existing.length > 0) throw new Error('You already reviewed this job')

    const { error: insertError } = await supabase.from('reviews').insert({
      freelancer_id: freelancerId,
      customer_id: customerId,
      job_id: jobId,
      job_title: jobTitle,
      rating,
      comment,
      created_at: new Date().toISOString(),
    })
    if (insertError) throw insertError

    const { data: allReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('freelancer_id', freelancerId)
    if (reviewsError) throw reviewsError

    const ratings = allReviews.map((review) => review.rating)
    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length

    const { error: updateError } = await supabase
      .from('freelancers')
      .update({
        average_rating: parseFloat(average.toFixed(1)),
        total_reviews: ratings.length,
      })
      .eq('firebase_uid', freelancerId)
    if (updateError) throw updateError
  },

  listenToFreelancerReviews(freelancerId, callback) {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('freelancer_id', freelancerId)
      if (error) {
        console.error(error)
        return
      }
      callback(
        data
          .map((review) => ({
            ...review,
            createdAt: review.created_at,
            jobTitle: review.job_title,
          }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      )
    }

    fetchReviews()

    const channel = supabase
      .channel(`reviews-${freelancerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews', filter: `freelancer_id=eq.${freelancerId}` },
        async () => {
          await fetchReviews()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  },
}