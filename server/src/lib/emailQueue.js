import { Queue } from 'bullmq'

const redisConnection = {
  // In Docker Compose the Redis service is reachable at 'redis'
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
}

const queueName = process.env.EMAIL_QUEUE_NAME || 'emailQueue'

const emailQueue = new Queue(queueName, { connection: redisConnection })

/**
 * Enqueue multiple email jobs. Each job expected to have:
 * { to, templateId, subject, body, variables, createdBy }
 */
export async function enqueueEmailJobs(jobs = []) {
  const created = []
  for (const job of jobs) {
    try {
      const j = await emailQueue.add('sendEmail', job, {
        attempts: job.attempts ?? 3,
        backoff: { type: 'exponential', delay: 60 * 1000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      })
      created.push(j.id)
    } catch (err) {
      console.error('Failed to enqueue job', err)
    }
  }
  return created
}

export function getEmailQueue() {
  return emailQueue
}

export default emailQueue
