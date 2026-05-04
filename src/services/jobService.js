import { supabase } from '../supabase.js'

function mapJobRow(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    assignedFreelancerId: row.assigned_freelancer_id,
    title: row.title,
    description: row.description,
    budget: row.budget,
    timeline: row.timeline,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categories: row.job_categories?.map((cat) => cat.category) || [],
    applications: row.applications?.map((app) => ({
      id: app.id,
      jobId: app.job_id,
      freelancerId: app.freelancer_id,
      message: app.message,
      appliedAt: app.applied_at,
    })) || [],
  }
}

export const jobService = {
  async createJob(uid, data) {
    const now = new Date().toISOString()
    const { data: insertedJob, error } = await supabase
      .from('jobs')
      .insert({
        customer_id: uid,
        title: data.title,
        description: data.description,
        budget: data.budget,
        timeline: data.timeline,
        status: 'open',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (error) throw error

    const categoryRows = data.categories.map((category) => ({
      job_id: insertedJob.id,
      category,
    }))
    if (categoryRows.length > 0) {
      const { error: categoryError } = await supabase.from('job_categories').insert(categoryRows)
      if (categoryError) throw categoryError
    }

    return insertedJob.id
  },

  async getJobById(jobId) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, job_categories(category), applications(*)')
      .eq('id', jobId)
      .maybeSingle()

    if (error) throw error
    return data ? mapJobRow(data) : null
  },

  async getJobsByCustomer(uid) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, job_categories(category), applications(*)')
      .eq('customer_id', uid)

    if (error) throw error
    return data.map(mapJobRow)
  },

  async getJobsByCategory(category) {
    const { data: rows, error } = await supabase
      .from('jobs')
      .select('*, job_categories(category), applications(*)')
      .eq('status', 'open')
      .eq('job_categories.category', category)

    if (error) throw error
    return rows.map(mapJobRow)
  },

  async getAllOpenJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, job_categories(category), applications(*)')
      .eq('status', 'open')

    if (error) throw error
    return data
      .map(mapJobRow)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  },

  async applyForJob(jobId, freelancerId, message) {
    const { data: existing, error: existingError } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('freelancer_id', freelancerId)

    if (existingError) throw existingError
    if (existing.length > 0) return

    const { error } = await supabase.from('applications').insert({
      job_id: jobId,
      freelancer_id: freelancerId,
      message,
      applied_at: new Date().toISOString(),
    })
    if (error) throw error
  },

  async updateJobStatus(jobId, status) {
    const { error } = await supabase
      .from('jobs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', jobId)
    if (error) throw error
  },

  async deleteJob(jobId) {
    const { error } = await supabase.from('jobs').delete().eq('id', jobId)
    if (error) throw error
  },

  listenToOpenJobs(callback) {
    const fetchOpenJobs = async () => {
      const jobs = await this.getAllOpenJobs()
      callback(jobs)
    }

    fetchOpenJobs()

    const channel = supabase
      .channel(`jobs-open-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: 'status=eq.open' },
        async () => {
          await fetchOpenJobs()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  },

  listenToCustomerJobs(uid, callback) {
    const fetchCustomerJobs = async () => {
      const jobs = await this.getJobsByCustomer(uid)
      callback(jobs)
    }

    fetchCustomerJobs()

    const channel = supabase
      .channel(`jobs-customer-${uid}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: `customer_id=eq.${uid}` },
        async () => {
          await fetchCustomerJobs()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  },

  async reopenJob(jobId) {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', jobId)
    if (error) throw error
  },

  async withdrawApplication(jobId, freelancerId) {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('job_id', jobId)
      .eq('freelancer_id', freelancerId)
    if (error) throw error
  },
}
