import { supabase } from '../supabase.js'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebaseConfig'
import { notificationService } from './notificationService.js'

function mapCertificationRow(row) {
  return {
    id: row.id,
    freelancerId: row.freelancer_id,
    title: row.title,
    imageUrl: row.image_url,
    status: row.status,
    rejectionReason: row.rejection_reason,
    submittedAt: row.submitted_at,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
  }
}

export const certificationService = {
  async uploadCertificationImage(freelancerId, file) {
    const timestamp = Date.now()
    const filename = `${freelancerId}-${timestamp}-${file.name}`
    const storageRef = ref(storage, `certifications/${freelancerId}/${filename}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    return url
  },

  async addCertification(freelancerId, certData) {
    const { data: certification, error } = await supabase
      .from('certifications')
      .insert({
        freelancer_id: freelancerId,
        title: certData.title,
        image_url: certData.imageUrl,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        verified_at: null,
        verified_by: null,
        rejection_reason: null,
      })
      .select('id')
      .single()

    if (error) throw error

    await this.createEditLog(freelancerId, 'certification_added', {
      certificationId: certification.id,
      certificationTitle: certData.title,
      certificationImage: certData.imageUrl,
    })

    return certification.id
  },

  async getCertificationsByFreelancer(freelancerId) {
    const { data, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('freelancer_id', freelancerId)
    if (error) throw error
    return data.map(mapCertificationRow)
  },

  async getPendingEditLogs() {
    const { data: pendingCerts, error: certError } = await supabase
      .from('certifications')
      .select('*')
      .eq('status', 'pending')
    if (certError) throw certError

    const logs = await Promise.all(
      pendingCerts.map(async (cert) => {
        const { data: logData, error: logError } = await supabase
          .from('edit_logs')
          .select('*')
          .contains('details', { certificationId: cert.id })
          .eq('change_type', 'certification_added')
          .limit(1)
          .maybeSingle()
        if (logError) throw logError

        const { data: freelancer, error: freelancerError } = await supabase
          .from('freelancers')
          .select('display_name, email, photo_url')
          .eq('firebase_uid', cert.freelancer_id)
          .maybeSingle()
        if (freelancerError) throw freelancerError

        return {
          id: logData?.id || cert.id,
          certificationId: cert.id,
          changeType: 'certification_added',
          details: logData?.details || {
            certificationId: cert.id,
            certificationTitle: cert.title,
            certificationImage: cert.image_url,
          },
          freelancerName: freelancer?.display_name || 'Unknown',
          freelancerEmail: freelancer?.email || 'N/A',
          freelancerPhoto: freelancer?.photo_url || null,
          createdAt: logData?.created_at || cert.submitted_at,
        }
      })
    )

    return logs
  },

  async verifyCertification(certificationId, adminUid) {
    const { data: cert } = await supabase
      .from('certifications')
      .select('freelancer_id, title')
      .eq('id', certificationId)
      .single()

    const { error } = await supabase
      .from('certifications')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: adminUid,
      })
      .eq('id', certificationId)
    if (error) throw error

    if (cert) {
      await notificationService.createNotification(
        cert.freelancer_id,
        'certification_verified',
        'Certification Verified',
        `Your certification "${cert.title}" has been verified by the admin!`
      )
    }
  },

  async rejectCertification(certificationId, adminUid, reason) {
    const { data: cert } = await supabase
      .from('certifications')
      .select('freelancer_id, title')
      .eq('id', certificationId)
      .single()

    const { error } = await supabase
      .from('certifications')
      .update({
        status: 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: adminUid,
        rejection_reason: reason,
      })
      .eq('id', certificationId)
    if (error) throw error

    if (cert) {
      await notificationService.createNotification(
        cert.freelancer_id,
        'certification_rejected',
        'Certification Rejected',
        `Your certification "${cert.title}" was rejected${reason ? `: ${reason}` : '.'}`
      )
    }
  },

  async createEditLog(freelancerId, changeType, details) {
    const { error } = await supabase.from('edit_logs').insert({
      freelancer_id: freelancerId,
      change_type: changeType,
      details,
      created_at: new Date().toISOString(),
    })
    if (error) throw error
  },

  async getEditLogsByFreelancer(freelancerId) {
    const { data, error } = await supabase
      .from('edit_logs')
      .select('*')
      .eq('freelancer_id', freelancerId)
    if (error) throw error
    return data
  },

  async markEditLogReviewed(logId) {
    const { error } = await supabase.from('edit_logs').delete().eq('id', logId)
    if (error) throw error
  },

  listenToPendingEditLogs(callback) {
    const fetchPending = async () => {
      const logs = await this.getPendingEditLogs()
      callback(logs)
    }

    fetchPending()

    const channel = supabase
      .channel('certifications-pending')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'certifications', filter: 'status=eq.pending' },
        async () => {
          await fetchPending()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  },

  async getVerifiedCertificationsByFreelancer(freelancerId) {
    const { data, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('freelancer_id', freelancerId)
      .eq('status', 'verified')
    if (error) throw error
    return data.map(mapCertificationRow)
  },
}

