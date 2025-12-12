import 'dotenv/config'
import mysql from 'mysql2/promise'
import nodemailer from 'nodemailer'
import { Worker } from 'bullmq'

// Minimal DB pool for worker
const pool = (mysql && (mysql.createPool || mysql.default?.createPool))
  ? (mysql.createPool || mysql.default?.createPool)({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tulandingya',
    waitForConnections: true,
    namedPlaceholders: true,
  })
  : null

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

function toMySQLDateTime(input) {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return null
  const pad = (v) => v.toString().padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
}

// Copy of replacePlaceholders used in main app
function replacePlaceholders(templateStr, variables = {}) {
  if (!templateStr) return ''
  let out = String(templateStr)
  try {
    const findKeyRecursively = (obj, key, visited = new Set()) => {
      if (obj == null || typeof obj !== 'object') return undefined
      if (visited.has(obj)) return undefined
      visited.add(obj)
      if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key]
      for (const k of Object.keys(obj)) {
        try {
          const val = obj[k]
          if (val && typeof val === 'object') {
            const found = findKeyRecursively(val, key, visited)
            if (found !== undefined) return found
          }
        } catch (e) {}
      }
      return undefined
    }

    out = out.replace(/{{\s*([^}]+?)\s*}}/g, (match, p1) => {
      const keyPath = p1.trim()
      const parts = keyPath.split('.')
      let cur = variables
      for (const part of parts) {
        if (cur == null) {
          if (parts.length === 1) {
            const found = findKeyRecursively(variables, part)
            return found == null ? '' : String(found)
          }
          return ''
        }
        if (Object.prototype.hasOwnProperty.call(cur, part)) {
          cur = cur[part]
        } else if (/^\d+$/.test(part) && Array.isArray(cur)) {
          cur = cur[Number(part)]
        } else {
          cur = cur[part] ?? cur[part.toLowerCase()]
        }
      }
      if (cur === undefined || cur === null) {
        if (parts.length === 1) {
          const found = findKeyRecursively(variables, parts[0])
          return found == null ? '' : String(found)
        }
        return ''
      }
      return String(cur)
    })
  } catch (e) {
    console.error('Error replacing placeholders', e)
  }
  return out
}

async function ensureTables() {
  if (!pool) return
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        to_email VARCHAR(255),
        template_id INT NULL,
        status VARCHAR(50),
        provider_response TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_unsubscribes (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255),
        token VARCHAR(255),
        reason VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)
  } catch (err) {
    console.error('Error ensuring email tables', err)
  }
}

async function isSuppressed(email) {
  if (!pool) return false
  try {
    const [rows] = await pool.query('SELECT id FROM email_unsubscribes WHERE email = :email LIMIT 1', { email })
    return Array.isArray(rows) && rows.length > 0
  } catch (err) {
    console.error('isSuppressed error', err)
    return false
  }
}

// Worker processor
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
}

const worker = new Worker(
  process.env.EMAIL_QUEUE_NAME || 'emailQueue',
  async (job) => {
    const data = job.data || {}
    const to = data.to
    const templateId = data.templateId
    const subjectIn = data.subject || ''
    const bodyIn = data.body || ''
    const variables = data.variables || {}

    try {
      if (!to) throw new Error('Missing recipient')

      // Ensure tables exist
      await ensureTables()

      // Check suppression list
      const suppressed = await isSuppressed(to)
      if (suppressed) {
        await pool.query('INSERT INTO email_logs (to_email, template_id, status, provider_response) VALUES (:to, :template_id, :status, :resp)', { to, template_id: templateId || null, status: 'suppressed', resp: 'suppressed' })
        return { ok: true, suppressed: true }
      }

      let finalSubject = subjectIn
      let finalBody = bodyIn
      if (templateId && pool) {
        const [trows] = await pool.query('SELECT * FROM email_templates WHERE id = :id LIMIT 1', { id: templateId })
        const template = trows && trows[0]
        if (template) {
          finalSubject = replacePlaceholders(template.subject, variables)
          finalBody = replacePlaceholders(template.body, variables)
        }
      } else {
        finalSubject = replacePlaceholders(finalSubject || '', variables)
        finalBody = replacePlaceholders(finalBody || '', variables)
      }

      if (!process.env.SMTP_HOST) {
        console.log('[worker] SMTP not configured. Email payload:', { to, subject: finalSubject })
        await pool.query('INSERT INTO email_logs (to_email, template_id, status, provider_response) VALUES (:to, :template_id, :status, :resp)', { to, template_id: templateId || null, status: 'logged', resp: 'smtp_not_configured' })
        return { ok: true, logged: true }
      }

      try {
        const info = await transporter.sendMail({ from: process.env.SMTP_FROM || '"Admin" <noreply@example.com>', to, subject: finalSubject || '(sin asunto)', html: finalBody || '' })
        await pool.query('INSERT INTO email_logs (to_email, template_id, status, provider_response) VALUES (:to, :template_id, :status, :resp)', { to, template_id: templateId || null, status: 'sent', resp: JSON.stringify(info) })
        return { ok: true, info }
      } catch (err) {
        console.error('[worker] sendMail error', err)
        await pool.query('INSERT INTO email_logs (to_email, template_id, status, provider_response) VALUES (:to, :template_id, :status, :resp)', { to, template_id: templateId || null, status: 'error', resp: String(err?.message || err) })
        throw err
      }
    } catch (err) {
      console.error('[worker] job failed', err)
      throw err
    }
  },
  { connection: redisConnection }
)

worker.on('completed', (job) => {
  console.log('[worker] job completed', job.id)
})

worker.on('failed', (job, err) => {
  console.error('[worker] job failed', job?.id, err?.message)
})

console.log('[worker] email worker started')
