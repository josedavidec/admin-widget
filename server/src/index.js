import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { createPool } from 'mysql2/promise'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me'

const app = express()

app.set('trust proxy', 1) // Confiar en el proxy (nginx)

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten imágenes'))
    }
  }
})

const config = {
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  env: process.env.NODE_ENV ?? 'production',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'tulandingya',
    connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT ?? '10', 10),
  },
}

const pool = createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  connectionLimit: config.db.connectionLimit,
  waitForConnections: true,
  namedPlaceholders: true,
  timezone: 'Z',
})

const corsWhitelist = new Set(config.allowedOrigins)

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'TuLandingYa')
  next()
})

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsWhitelist.size === 0 || corsWhitelist.has(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Origin not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-password', 'Authorization'],
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(uploadDir))
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
)
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'))

const STATUS_OPTIONS = ['Nuevo', 'Contactado', 'En seguimiento', 'Convertido', 'Descartado']

const optionalEmail = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null
    const trimmed = String(value).trim()
    return trimmed === '' ? null : trimmed
  },
  z.string().email().max(160).nullable(),
)

const optionalRole = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null
    const trimmed = String(value).trim()
    return trimmed === '' ? null : trimmed
  },
  z.string().max(120).nullable(),
)

function toMySQLDateTime(input) {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const pad = (value) => value.toString().padStart(2, '0')

  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  const seconds = pad(date.getUTCSeconds())

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const leadSchema = z.object({
  name: z.string().min(3).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(60).optional().transform((value) => value ?? ''),
  company: z.string().max(160).optional().transform((value) => value ?? ''),
  services: z.array(z.string().min(3)).min(1).max(6),
  budgetRange: z.string().max(80),
  message: z.string().max(1200).optional().transform((value) => value ?? ''),
})

const leadUpdateSchema = z
  .object({
    status: z.string().max(60).optional(),
    note: z.string().max(4000).optional(),
    assignedTo: z.string().max(160).optional(),
    tags: z.array(z.string()).optional(),
    lastContactAt: z.string().datetime().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar',
  })

const teamMemberSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: optionalEmail,
  role: optionalRole,
  password: z.string().min(6).optional(),
  isAdmin: z.boolean().optional().default(false),
})

const teamMemberUpdateSchema = teamMemberSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar',
  })

const sectionSettingsSchema = z.object({
  leads: z.boolean().optional().default(true),
  team: z.boolean().optional().default(false),
  tasks: z.boolean().optional().default(true),
  brands: z.boolean().optional().default(true),
  blog: z.boolean().optional().default(true),
  emails: z.boolean().optional().default(true),
  social: z.boolean().optional().default(true),
  media: z.boolean().optional().default(true),
})

const taskSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  assignedToId: z.number().int().positive().nullable().optional(),
  brandId: z.number().int().positive().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
})

const taskUpdateSchema = taskSchema.partial()

const brandSchema = z.object({
  name: z.string().trim().min(1).max(120),
  color: z.string().max(20).optional().default('#3b82f6'),
  package: z.string().max(120).optional().default(''),
  contactInfo: z.string().max(500).optional().default(''),
})

const brandUpdateSchema = brandSchema.partial()

const blogPostSchema = z.object({
  slug: z.string().trim().min(1).max(255),
  title: z.string().trim().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  image: z.string().url().optional().or(z.literal('')),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
})

const blogPostUpdateSchema = blogPostSchema.partial()

const newsletterSchema = z.object({
  email: z.string().email().max(160),
})

async function validateAuth(req) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return null

  try {
    const payload = jwt.verify(token, JWT_SECRET)

    // Super Admin (id 0) keeps token payload
    if (payload.id === 0) return payload

    // Regular admin/members: always refresh from DB for up-to-date permissions
    const [rows] = await pool.query('SELECT * FROM team_members WHERE id = :id LIMIT 1', { id: payload.id })
    const user = rows[0]
    if (!user) return null

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: Boolean(user.is_admin),
      isSuperAdmin: false,
    }
  } catch (error) {
    return null
  }
}

async function getSectionSettings() {
  try {
    const [rows] = await pool.query('SELECT leads, team, tasks, brands, blog, emails, social, media FROM section_settings WHERE id = 1')
    if (rows.length > 0) {
      return {
        leads: Boolean(rows[0].leads),
        team: Boolean(rows[0].team),
        tasks: Boolean(rows[0].tasks),
        brands: Boolean(rows[0].brands),
        blog: Boolean(rows[0].blog),
        emails: Boolean(rows[0].emails),
        social: Boolean(rows[0].social),
        media: Boolean(rows[0].media),
      }
    }
    return { leads: true, team: true, tasks: true, brands: true, blog: true, emails: true, social: true, media: true }
  } catch (error) {
    return { leads: true, team: true, tasks: true, brands: true, blog: true, emails: true, social: true, media: true }
  }
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const sectionSettings = await getSectionSettings()
    
    // Master Admin Login (Super Admin - Developer Access)
    if (email === 'admin' && password === (process.env.ADMIN_PASSWORD || 'admin123')) {
      const user = { 
        id: 0, 
        name: 'Super Admin', 
        email: 'admin',
        role: 'super_admin',
        isSuperAdmin: true,
        isAdmin: false,
        sectionSettings,
      }
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
      return res.json({ token, user })
    }

    // Team Member / Admin Login
    const [rows] = await pool.query('SELECT * FROM team_members WHERE email = :email', { email })
    const user = rows[0]

    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const tokenPayload = { 
      id: user.id, 
      name: user.name, 
      email: user.email,
      role: user.role, 
      isAdmin: Boolean(user.is_admin),
      isSuperAdmin: false,
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' })

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        photoUrl: user.photo_url,
        isAdmin: Boolean(user.is_admin),
        isSuperAdmin: false,
        sectionSettings,
      } 
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
})

app.get('/api/auth/me', async (req, res) => {
  const userPayload = await validateAuth(req)
  if (!userPayload) return res.status(401).json({ message: 'No autorizado' })

  // Super Admin (id 0)
  if (userPayload.id === 0) {
    const sectionSettings = await getSectionSettings()
    return res.json({ ...userPayload, sectionSettings })
  }

  try {
    const [rows] = await pool.query('SELECT * FROM team_members WHERE id = :id', { id: userPayload.id })
    const user = rows[0]

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' })
    }

    const sectionSettings = await getSectionSettings()

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      photoUrl: user.photo_url,
      isAdmin: Boolean(user.is_admin),
      isSuperAdmin: false,
      sectionSettings,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al obtener usuario' })
  }
})

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const user = await validateAuth(req)
    if (!user) return res.status(401).json({ message: 'No autorizado' })

    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Datos inválidos' })
    }

    const [rows] = await pool.query('SELECT * FROM team_members WHERE id = :id', { id: user.id })
    const dbUser = rows[0]

    if (!dbUser || !dbUser.password_hash) {
      return res.status(400).json({ message: 'Usuario no válido' })
    }

    const validPassword = await bcrypt.compare(currentPassword, dbUser.password_hash)
    if (!validPassword) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' })
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(newPassword, salt)

    await pool.query('UPDATE team_members SET password_hash = :hash WHERE id = :id', { hash, id: user.id })

    res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al cambiar la contraseña' })
  }
})

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email requerido' })

    const [rows] = await pool.query('SELECT * FROM team_members WHERE email = :email', { email })
    const user = rows[0]

    if (!user) {
      return res.json({ message: 'Si el correo existe, recibirás instrucciones' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600000)

    await pool.query(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (:email, :token, :expiresAt)',
      { email, token, expiresAt }
    )

    const resetLink = `${req.headers.origin}/admin?token=${token}`

    if (process.env.SMTP_HOST) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Admin" <noreply@example.com>',
        to: email,
        subject: 'Recuperación de contraseña',
        html: `
          <p>Hola ${user.name},</p>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>Este enlace expira en 1 hora.</p>
        `
      })
    } else {
      console.log('SMTP not configured. Reset link:', resetLink)
    }

    res.json({ message: 'Si el correo existe, recibirás instrucciones' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al procesar la solicitud' })
  }
})

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Datos inválidos' })
    }

    const [rows] = await pool.query(
      'SELECT * FROM password_resets WHERE token = :token AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      { token }
    )
    const resetRequest = rows[0]

    if (!resetRequest) {
      return res.status(400).json({ message: 'Token inválido o expirado' })
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(newPassword, salt)

    await pool.query('UPDATE team_members SET password_hash = :hash WHERE email = :email', { 
      hash, 
      email: resetRequest.email 
    })

    await pool.query('DELETE FROM password_resets WHERE email = :email', { email: resetRequest.email })

    res.json({ message: 'Contraseña restablecida correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al restablecer la contraseña' })
  }
})

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok')
    res.json({ status: 'ok', db: rows[0].ok === 1 })
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
})

// --- Email templates and sending ---
function replacePlaceholders(templateStr, variables = {}) {
  if (!templateStr) return ''
  let out = templateStr
  try {
    for (const [key, value] of Object.entries(variables || {})) {
      const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      out = out.replace(re, String(value ?? ''))
    }
  } catch (e) {
    console.error('Error replacing placeholders', e)
  }
  return out
}

app.get('/api/email-templates', async (req, res) => {
  try {
    const user = await validateAuth(req)
    if (!user) return res.status(401).json({ message: 'No autorizado' })

    const [rows] = await pool.query('SELECT * FROM email_templates ORDER BY id DESC')
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al leer plantillas' })
  }
})

app.post('/api/email-templates', async (req, res) => {
  try {
    const user = await validateAuth(req)
    if (!user) return res.status(401).json({ message: 'No autorizado' })

    const { name, subject, body, variables, json_schema } = req.body
    if (!name || !subject || !body) return res.status(400).json({ message: 'Datos inválidos' })

    const [result] = await pool.query(
      'INSERT INTO email_templates (name, subject, body, variables, json_schema, created_by) VALUES (:name, :subject, :body, :variables, :json_schema, :created_by)',
      { name, subject, body, variables: variables ? JSON.stringify(variables) : null, json_schema: json_schema ? JSON.stringify(json_schema) : null, created_by: user.id }
    )

    const [rows] = await pool.query('SELECT * FROM email_templates WHERE id = :id LIMIT 1', { id: result.insertId })
    res.json(rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al crear plantilla' })
  }
})

app.put('/api/email-templates/:id', async (req, res) => {
  try {
    const user = await validateAuth(req)
    if (!user) return res.status(401).json({ message: 'No autorizado' })

    const id = Number(req.params.id)
    const { name, subject, body, variables, json_schema } = req.body
    if (!id || !name || !subject || !body) return res.status(400).json({ message: 'Datos inválidos' })

    await pool.query(
      'UPDATE email_templates SET name = :name, subject = :subject, body = :body, variables = :variables, json_schema = :json_schema WHERE id = :id',
      { id, name, subject, body, variables: variables ? JSON.stringify(variables) : null, json_schema: json_schema ? JSON.stringify(json_schema) : null }
    )

    const [rows] = await pool.query('SELECT * FROM email_templates WHERE id = :id LIMIT 1', { id })
    res.json(rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al actualizar plantilla' })
  }
})

app.delete('/api/email-templates/:id', async (req, res) => {
  try {
    const user = await validateAuth(req)
    if (!user) return res.status(401).json({ message: 'No autorizado' })

    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Id inválido' })

    await pool.query('DELETE FROM email_templates WHERE id = :id', { id })
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al eliminar plantilla' })
  }
})

app.post('/api/email/send', async (req, res) => {
  try {
    const user = await validateAuth(req)
    if (!user) return res.status(401).json({ message: 'No autorizado' })

    const { to, templateId, subject, body, variables } = req.body
    if (!to) return res.status(400).json({ message: 'Campo "to" requerido' })

    let finalSubject = subject
    let finalBody = body

    if (templateId) {
      const [trows] = await pool.query('SELECT * FROM email_templates WHERE id = :id LIMIT 1', { id: templateId })
      const template = trows[0]
      if (!template) return res.status(400).json({ message: 'Plantilla no encontrada' })
      finalSubject = replacePlaceholders(template.subject, variables || {})
      finalBody = replacePlaceholders(template.body, variables || {})
    } else {
      finalSubject = replacePlaceholders(finalSubject || '', variables || {})
      finalBody = replacePlaceholders(finalBody || '', variables || {})
    }

    if (!process.env.SMTP_HOST) {
      console.log('SMTP not configured. Email payload:', { to, subject: finalSubject })
      return res.json({ ok: true, note: 'SMTP not configured; logged to console' })
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Admin" <noreply@example.com>',
      to,
      subject: finalSubject || '(sin asunto)',
      html: finalBody || '',
    })

    res.json({ ok: true })
  } catch (error) {
    console.error('Error sending email', error)
    res.status(500).json({ message: 'Error al enviar correo' })
  }
})

app.post('/api/email/schedule', async (req, res) => {
  try {
    const user = await validateAuth(req)
    if (!user) return res.status(401).json({ message: 'No autorizado' })

    const { to, templateId, subject, body, variables, sendAt } = req.body
    if (!to || !sendAt) return res.status(400).json({ message: 'Campos "to" y "sendAt" son requeridos' })

    const sendDate = new Date(sendAt)
    if (Number.isNaN(sendDate.getTime())) return res.status(400).json({ message: 'Fecha inválida' })

    const [result] = await pool.query(
      'INSERT INTO email_schedules (to_email, template_id, subject, body, variables, send_at, created_by) VALUES (:to_email, :template_id, :subject, :body, :variables, :send_at, :created_by)',
      { to_email: to, template_id: templateId || null, subject: subject || null, body: body || null, variables: variables ? JSON.stringify(variables) : null, send_at: toMySQLDateTime(sendDate), created_by: user.id }
    )

    res.json({ ok: true, id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al programar correo' })
  }
})

// Scheduled processor (polls DB every minute)
let _emailProcessorInterval = null
async function processScheduledEmailsOnce() {
  try {
    if (!process.env.SMTP_HOST) return
    const [rows] = await pool.query("SELECT * FROM email_schedules WHERE status = 'pending' AND send_at <= NOW() ORDER BY send_at ASC LIMIT 20")
    for (const job of rows) {
      try {
        // Build message
        let finalSubject = job.subject
        let finalBody = job.body
        let vars = {}
        try { vars = job.variables ? JSON.parse(job.variables) : {} } catch (e) { vars = {} }

        if (job.template_id) {
          const [trows] = await pool.query('SELECT * FROM email_templates WHERE id = :id LIMIT 1', { id: job.template_id })
          const template = trows[0]
          if (template) {
            finalSubject = replacePlaceholders(template.subject, vars)
            finalBody = replacePlaceholders(template.body, vars)
          }
        } else {
          finalSubject = replacePlaceholders(finalSubject || '', vars)
          finalBody = replacePlaceholders(finalBody || '', vars)
        }

        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Admin" <noreply@example.com>',
          to: job.to_email,
          subject: finalSubject || '(sin asunto)',
          html: finalBody || '',
        })

        await pool.query('UPDATE email_schedules SET status = "sent" WHERE id = :id', { id: job.id })
      } catch (err) {
        console.error('Failed scheduled email', job.id, err)
        await pool.query('UPDATE email_schedules SET status = "failed", error_text = :err WHERE id = :id', { id: job.id, err: String(err?.message || err) })
      }
    }
  } catch (err) {
    console.error('Error processing scheduled emails', err)
  }
}

function startEmailProcessor() {
  if (_emailProcessorInterval) return
  // Run immediately, then every 60 seconds
  processScheduledEmailsOnce()
  _emailProcessorInterval = setInterval(() => {
    processScheduledEmailsOnce()
  }, 60 * 1000)
}


app.get('/api/leads', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const [rows] = await pool.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 100')
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.post('/api/leads', async (req, res, next) => {
  try {
    const payload = leadSchema.parse(req.body)

    await pool.query(
      `INSERT INTO leads (name, email, phone, company, services, budget_range, message, source_ip, status)
       VALUES (:name, :email, :phone, :company, :services, :budgetRange, :message, :sourceIp, :status)`,
      {
        ...payload,
        services: JSON.stringify(payload.services),
        sourceIp: (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').toString().slice(0, 60),
        status: 'Nuevo',
      },
    )

    res.status(201).json({ message: 'Lead recibido. Te contactaremos pronto.' })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/leads/:id', async (req, res, next) => {
  try {
    const leadId = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({ message: 'Identificador inválido' })
    }

    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const payload = leadUpdateSchema.parse(req.body)

    const updates = []
    const bindings = { id: leadId }

    if (payload.status !== undefined) {
      const trimmedStatus = payload.status.trim()
      if (!STATUS_OPTIONS.includes(trimmedStatus)) {
        return res.status(400).json({ message: 'Estado inválido' })
      }
      updates.push('status = :status')
      bindings.status = trimmedStatus
    }

    if (payload.note !== undefined) {
      updates.push('note = :note')
      bindings.note = payload.note
    }

    if (payload.assignedTo !== undefined) {
      updates.push('assigned_to = :assignedTo')
      bindings.assignedTo = payload.assignedTo
    }

    if (payload.tags !== undefined) {
      updates.push('tags = :tags')
      bindings.tags = JSON.stringify(payload.tags)
    }

    if (payload.lastContactAt !== undefined) {
      const formatted = toMySQLDateTime(payload.lastContactAt)
      if (!formatted) {
        return res.status(400).json({ message: 'Fecha inválida para último contacto' })
      }
      updates.push('last_contact_at = :lastContactAt')
      bindings.lastContactAt = formatted
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Sin cambios por aplicar' })
    }

    const [result] = await pool.query(
      `UPDATE leads SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
      bindings,
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lead no encontrado' })
    }

    const [rows] = await pool.query('SELECT * FROM leads WHERE id = :id LIMIT 1', { id: leadId })
    return res.json(rows[0] ?? null)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/leads/:id', async (req, res, next) => {
  try {
    const leadId = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({ message: 'Identificador inválido' })
    }

    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const [result] = await pool.query('DELETE FROM leads WHERE id = :id', { id: leadId })

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lead no encontrado' })
    }

    return res.json({ message: 'Lead eliminado' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/team-members', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    // Super Admin: solo ve otros admins
    // Admin: ve todos los miembros
    let whereClause = ''
    if (user.isSuperAdmin) {
      whereClause = 'WHERE is_admin = true'
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, role, photo_url, is_admin FROM team_members ${whereClause} ORDER BY name ASC`,
    )

    return res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      photoUrl: row.photo_url,
      isAdmin: Boolean(row.is_admin),
    })))
  } catch (error) {
    next(error)
  }
})

app.post('/api/team-members', upload.single('photo'), async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    // Super Admin or existing Admin can create members
    if (!user || (!user.isSuperAdmin && !user.isAdmin)) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    // Convert string booleans from form-data
    const body = { ...req.body }
    if (body.isAdmin === 'true') body.isAdmin = true
    if (body.isAdmin === 'false') body.isAdmin = false

    const payload = teamMemberSchema.parse(body)

    // Super Admin can only create Admins, not regular members
    if (user.isSuperAdmin && !payload.isAdmin) {
      return res.status(403).json({ message: 'Super Admin solo puede crear Administradores' })
    }

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null
    const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : null

    const [result] = await pool.query(
      'INSERT INTO team_members (name, email, role, photo_url, password_hash, is_admin) VALUES (:name, :email, :role, :photoUrl, :passwordHash, :isAdmin)',
      {
        name: payload.name,
        email: payload.email,
        role: payload.role,
        photoUrl: photoUrl,
        passwordHash: passwordHash,
        isAdmin: payload.isAdmin,
      },
    )

    const insertedId = result.insertId
    const [rows] = await pool.query(
      'SELECT id, name, email, role, photo_url, is_admin FROM team_members WHERE id = :id LIMIT 1',
      { id: insertedId },
    )

    const row = rows[0]
    return res.status(201).json(row ? {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      photoUrl: row.photo_url,
      isAdmin: Boolean(row.is_admin),
    } : null)
  } catch (error) {
    next(error)
  }
})

app.patch('/api/team-members/:id', upload.single('photo'), async (req, res, next) => {
  try {
    const memberId = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(memberId) || memberId <= 0) {
      return res.status(400).json({ message: 'Identificador inválido' })
    }

    const user = await validateAuth(req)
    if (!user || !user.isAdmin) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    // Convert string booleans from form-data
    const body = { ...req.body }
    if (body.isAdmin === 'true') body.isAdmin = true
    if (body.isAdmin === 'false') body.isAdmin = false

    const payload = teamMemberUpdateSchema.parse(body)

    const updates = []
    const bindings = { id: memberId }

    if (payload.name !== undefined) {
      updates.push('name = :name')
      bindings.name = payload.name
    }

    if (payload.email !== undefined) {
      updates.push('email = :email')
      bindings.email = payload.email
    }

    if (payload.role !== undefined) {
      updates.push('role = :role')
      bindings.role = payload.role
    }

    if (payload.isAdmin !== undefined) {
      updates.push('is_admin = :isAdmin')
      bindings.isAdmin = payload.isAdmin
    }

    if (payload.password) {
      updates.push('password_hash = :passwordHash')
      bindings.passwordHash = await bcrypt.hash(payload.password, 10)
    }

    if (req.file) {
      updates.push('photo_url = :photoUrl')
      bindings.photoUrl = `/uploads/${req.file.filename}`
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Sin cambios por aplicar' })
    }

    const [result] = await pool.query(
      `UPDATE team_members SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
      bindings,
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Miembro no encontrado' })
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, photo_url, is_admin FROM team_members WHERE id = :id LIMIT 1',
      { id: memberId },
    )

    const row = rows[0]
    return res.json(row ? {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      photoUrl: row.photo_url,
      isAdmin: Boolean(row.is_admin),
    } : null)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/team-members/:id', async (req, res, next) => {
  try {
    const memberId = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(memberId) || memberId <= 0) {
      return res.status(400).json({ message: 'Identificador inválido' })
    }

    const user = await validateAuth(req)
    if (!user || !user.isAdmin) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const [result] = await pool.query('DELETE FROM team_members WHERE id = :id', { id: memberId })

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Miembro no encontrado' })
    }

    return res.json({ message: 'Miembro eliminado' })
  } catch (error) {
    next(error)
  }
})

// Section Settings Endpoints
app.get('/api/section-settings', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM section_settings WHERE id = 1')
    
    if (rows.length === 0) {
      return res.json({
        leads: true,
        team: true,
        tasks: true,
        brands: true,
        blog: true,
        emails: true,
        social: true,
        media: true,
      })
    }

    const settings = rows[0]
    return res.json({
      leads: Boolean(settings.leads),
      team: Boolean(settings.team),
      tasks: Boolean(settings.tasks),
      brands: Boolean(settings.brands),
      blog: Boolean(settings.blog),
      emails: Boolean(settings.emails),
      social: Boolean(settings.social),
      media: Boolean(settings.media),
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/section-settings', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user || !user.isSuperAdmin) {
      return res.status(401).json({ message: 'No autorizado. Solo Super Admin puede modificar secciones.' })
    }

    const payload = sectionSettingsSchema.parse(req.body)

    const [result] = await pool.query(`
        UPDATE section_settings 
        SET leads = :leads, team = :team, tasks = :tasks, brands = :brands, blog = :blog, emails = :emails, social = :social, media = :media
        WHERE id = 1
    `, {
      leads: Boolean(payload.leads),
      team: Boolean(payload.team),
      tasks: Boolean(payload.tasks),
      brands: Boolean(payload.brands),
        blog: Boolean(payload.blog),
        emails: Boolean(payload.emails),
        social: Boolean(payload.social),
        media: Boolean(payload.media),
    })

    return res.json({ 
      message: 'Secciones actualizadas',
      settings: payload
    })
  } catch (error) {
    next(error)
  }
})

// Media library endpoints
app.get('/api/media', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, file_name, original_name, mime_type, size, url, created_at FROM media_assets ORDER BY created_at DESC')
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

app.post('/api/media/upload', upload.single('file'), async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) return res.status(401).json({ message: 'No autorizado' })

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const filename = req.file.filename
    const original = req.file.originalname
    const mime = req.file.mimetype
    const size = req.file.size
    const url = `/uploads/${filename}`

    const [result] = await pool.query(`INSERT INTO media_assets (file_name, original_name, mime_type, size, url, created_by) VALUES (:file_name, :original_name, :mime_type, :size, :url, :created_by)`, {
      file_name: filename,
      original_name: original,
      mime_type: mime,
      size: size,
      url: url,
      created_by: user?.id ?? null,
    })

    const insertedId = result.insertId
    const [rows] = await pool.query('SELECT id, file_name, original_name, mime_type, size, url, created_at FROM media_assets WHERE id = :id LIMIT 1', { id: insertedId })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

app.delete('/api/media/:id', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) return res.status(401).json({ message: 'No autorizado' })

    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Invalid id' })

    const [rows] = await pool.query('SELECT file_name FROM media_assets WHERE id = :id LIMIT 1', { id })
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Asset not found' })

    const fileName = rows[0].file_name
    // delete DB row first
    await pool.query('DELETE FROM media_assets WHERE id = :id', { id })

    // attempt to remove file from uploads folder
    const p = path.join(uploadDir, fileName)
    fs.unlink(p, (err) => {
      if (err) console.debug('Could not delete file from disk:', err?.message || err)
    })

    res.json({ message: 'Deleted' })
  } catch (err) {
    next(err)
  }
})

// Tasks Endpoints
app.get('/api/tasks', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const [rows] = await pool.query(`
      SELECT t.*, tm.name as assigned_to_name, tm.photo_url as assigned_to_photo, b.name as brand_name, b.color as brand_color
      FROM tasks t 
      LEFT JOIN team_members tm ON t.assigned_to = tm.id 
      LEFT JOIN brands b ON t.brand_id = b.id
      ORDER BY t.created_at DESC
    `)
    
    res.json(rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      assignedToId: row.assigned_to,
      assignedToName: row.assigned_to_name,
      assignedToPhotoUrl: row.assigned_to_photo,
      brandId: row.brand_id,
      brandName: row.brand_name,
      brandColor: row.brand_color,
      dueDate: row.due_date,
      startDate: row.start_date,
      createdAt: row.created_at
    })))
  } catch (error) {
    next(error)
  }
})

app.post('/api/tasks', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const payload = taskSchema.parse(req.body)

    const [result] = await pool.query(
      `INSERT INTO tasks (title, description, status, assigned_to, brand_id, due_date, start_date)
       VALUES (:title, :description, :status, :assignedToId, :brandId, :dueDate, :startDate)`,
      {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        assignedToId: payload.assignedToId,
        brandId: payload.brandId,
        dueDate: payload.dueDate ? toMySQLDateTime(payload.dueDate) : null,
        startDate: payload.startDate ? toMySQLDateTime(payload.startDate) : null,
      },
    )

    const insertedId = result.insertId
    const [rows] = await pool.query(`
      SELECT t.*, tm.name as assigned_to_name, tm.photo_url as assigned_to_photo, b.name as brand_name, b.color as brand_color
      FROM tasks t 
      LEFT JOIN team_members tm ON t.assigned_to = tm.id 
      LEFT JOIN brands b ON t.brand_id = b.id
      WHERE t.id = :id LIMIT 1
    `, { id: insertedId })

    const row = rows[0]
    res.status(201).json(row ? {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      assignedToId: row.assigned_to,
      assignedToName: row.assigned_to_name,
      assignedToPhotoUrl: row.assigned_to_photo,
      brandId: row.brand_id,
      brandName: row.brand_name,
      brandColor: row.brand_color,
      dueDate: row.due_date,
      startDate: row.start_date,
      createdAt: row.created_at
    } : null)
  } catch (error) {
    next(error)
  }
})

app.patch('/api/tasks/:id', async (req, res, next) => {
  try {
    const taskId = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ message: 'Identificador inválido' })
    }

    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const payload = taskUpdateSchema.parse(req.body)
    const updates = []
    const bindings = { id: taskId }

    if (payload.title !== undefined) {
      updates.push('title = :title')
      bindings.title = payload.title
    }
    if (payload.description !== undefined) {
      updates.push('description = :description')
      bindings.description = payload.description
    }
    if (payload.status !== undefined) {
      updates.push('status = :status')
      bindings.status = payload.status
    }
    if (payload.assignedToId !== undefined) {
      updates.push('assigned_to = :assignedToId')
      bindings.assignedToId = payload.assignedToId
    }
    if (payload.brandId !== undefined) {
      updates.push('brand_id = :brandId')
      bindings.brandId = payload.brandId
    }
    if (payload.dueDate !== undefined) {
      updates.push('due_date = :dueDate')
      bindings.dueDate = payload.dueDate ? toMySQLDateTime(payload.dueDate) : null
    }
    if (payload.startDate !== undefined) {
      updates.push('start_date = :startDate')
      bindings.startDate = payload.startDate ? toMySQLDateTime(payload.startDate) : null
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Sin cambios' })
    }

    const [result] = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
      bindings,
    )
    const [rows] = await pool.query(`
      SELECT t.*, tm.name as assigned_to_name, tm.photo_url as assigned_to_photo, b.name as brand_name, b.color as brand_color
      FROM tasks t 
      LEFT JOIN team_members tm ON t.assigned_to = tm.id 
      LEFT JOIN brands b ON t.brand_id = b.id
      WHERE t.id = :id LIMIT 1
    `, { id: taskId })

    const row = rows[0]
    res.json(row ? {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      assignedToId: row.assigned_to,
      assignedToName: row.assigned_to_name,
      assignedToPhotoUrl: row.assigned_to_photo,
      brandId: row.brand_id,
      brandName: row.brand_name,
      brandColor: row.brand_color,
      dueDate: row.due_date,
      startDate: row.start_date,
      createdAt: row.created_at
    } : null)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/tasks/:id', async (req, res, next) => {
  try {
    const taskId = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ message: 'Identificador inválido' })
    }

    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const [result] = await pool.query('DELETE FROM tasks WHERE id = :id', { id: taskId })

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Tarea no encontrada' })
    }

    res.json({ message: 'Tarea eliminada' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/brands', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const [rows] = await pool.query('SELECT * FROM brands ORDER BY name ASC')
    
    // Parse socialAccounts JSON field
    const brands = rows.map(brand => {
      if (brand.social_accounts) {
        if (typeof brand.social_accounts === 'string') {
          try {
            brand.socialAccounts = JSON.parse(brand.social_accounts)
          } catch (e) {
            brand.socialAccounts = []
          }
        } else {
          brand.socialAccounts = brand.social_accounts
        }
        delete brand.social_accounts
      }
      return brand
    })
    
    res.json(brands)
  } catch (error) {
    next(error)
  }
})

app.post('/api/brands', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const { name, color, package: pkg, contactInfo, socialAccounts } = req.body
    
    const [result] = await pool.query(
      'INSERT INTO brands (name, color, package, contact_info, social_accounts) VALUES (:name, :color, :package, :contactInfo, :socialAccounts)',
      {
        name,
        color,
        package: pkg,
        contactInfo,
        socialAccounts: socialAccounts ? JSON.stringify(socialAccounts) : null
      }
    )

    const [rows] = await pool.query('SELECT * FROM brands WHERE id = :id', { id: result.insertId })
    const brand = rows[0]
    if (brand.social_accounts && typeof brand.social_accounts === 'string') {
      brand.socialAccounts = JSON.parse(brand.social_accounts)
      delete brand.social_accounts
    } else if (brand.social_accounts) {
      brand.socialAccounts = brand.social_accounts
      delete brand.social_accounts
    }
    res.status(201).json(brand)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/brands/:id', async (req, res, next) => {
  try {
    const brandId = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(brandId) || brandId <= 0) {
      return res.status(400).json({ message: 'Identificador inválido' })
    }

    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const [result] = await pool.query('DELETE FROM brands WHERE id = :id', { id: brandId })

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Marca no encontrada' })
    }

    res.json({ message: 'Marca eliminada' })
  } catch (error) {
    next(error)
  }
})

// Social Media Metrics Routes
app.get('/api/social-metrics', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const { brandId, platform, period = 'daily', days = 30 } = req.query
    let query = 'SELECT * FROM social_media_metrics WHERE 1=1'
    const params = {}

    if (brandId) {
      query += ' AND brand_id = :brandId'
      params.brandId = Number.parseInt(brandId, 10)
    }

    if (platform) {
      query += ' AND platform = :platform'
      params.platform = platform
    }

    if (period) {
      query += ' AND metric_period = :period'
      params.period = period
    }

    const daysNum = Number.parseInt(days, 10)
    query += ' AND metric_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)'
    params.days = daysNum

    query += ' ORDER BY brand_id, platform, metric_date DESC'

    const [rows] = await pool.query(query, params)
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.post('/api/social-metrics', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const { brandId, platform, followers, engagement, reach, impressions, metricDate, metricPeriod = 'daily' } = req.body

    const [result] = await pool.query(
      `INSERT INTO social_media_metrics (brand_id, platform, followers, engagement, reach, impressions, metric_date, metric_period)
       VALUES (:brandId, :platform, :followers, :engagement, :reach, :impressions, :metricDate, :metricPeriod)
       ON DUPLICATE KEY UPDATE followers = :followers, engagement = :engagement, reach = :reach, impressions = :impressions`,
      {
        brandId,
        platform,
        followers,
        engagement,
        reach,
        impressions,
        metricDate,
        metricPeriod,
      },
    )

    res.json({ id: result.insertId, message: 'Métrica guardada' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/brands/:id/metrics', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const brandId = Number.parseInt(req.params.id, 10)
    const { period = 'daily', days = 30 } = req.query

    const [metrics] = await pool.query(
      `SELECT platform, 
              ROUND(AVG(followers), 0) as avgFollowers,
              MAX(followers) as maxFollowers,
              ROUND(AVG(engagement), 2) as avgEngagement,
              ROUND(AVG(reach), 0) as avgReach,
              ROUND(AVG(impressions), 0) as avgImpressions,
              COUNT(*) as dataPoints
       FROM social_media_metrics
       WHERE brand_id = :brandId AND metric_period = :period AND metric_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       GROUP BY platform
       ORDER BY platform`,
      { brandId, period, days: Number.parseInt(days, 10) },
    )

    const [timeSeries] = await pool.query(
      `SELECT platform, metric_date, followers, engagement, reach, impressions
       FROM social_media_metrics
       WHERE brand_id = :brandId AND metric_period = :period AND metric_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       ORDER BY metric_date ASC`,
      { brandId, period, days: Number.parseInt(days, 10) },
    )

    res.json({
      summary: metrics,
      timeSeries,
    })
  } catch (error) {
    next(error)
  }
})

// Blog Routes
app.get('/api/blog', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blog_posts ORDER BY date DESC')
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.get('/api/blog/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Identificador inválido' })
    }

    const [rows] = await pool.query('SELECT * FROM blog_posts WHERE id = ?', [id])
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Entrada no encontrada' })
    }
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
})

app.post('/api/blog', async (req, res, next) => {
  try {
    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const payload = blogPostSchema.parse(req.body)
    
    // Check for duplicate slug
    const [existing] = await pool.query('SELECT id FROM blog_posts WHERE slug = ?', [payload.slug])
    if (existing.length > 0) {
      return res.status(409).json({ message: 'El slug ya existe' })
    }

    const [result] = await pool.query(
      'INSERT INTO blog_posts (slug, title, date, image, excerpt, content, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [payload.slug, payload.title, payload.date, payload.image, payload.excerpt, payload.content, payload.description]
    )

    const [rows] = await pool.query('SELECT * FROM blog_posts WHERE id = ?', [result.insertId])
    res.status(201).json(rows[0])
  } catch (error) {
    next(error)
  }
})

app.put('/api/blog/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Identificador inválido' })
    }

    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const payload = blogPostUpdateSchema.parse(req.body)
    
    if (payload.slug) {
      const [existing] = await pool.query('SELECT id FROM blog_posts WHERE slug = ? AND id != ?', [payload.slug, id])
      if (existing.length > 0) {
        return res.status(409).json({ message: 'El slug ya existe' })
      }
    }

    const fields = []
    const values = []
    for (const [key, value] of Object.entries(payload)) {
      fields.push(`${key} = ?`)
      values.push(value)
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' })
    }

    values.push(id)
    await pool.query(`UPDATE blog_posts SET ${fields.join(', ')} WHERE id = ?`, values)

    const [rows] = await pool.query('SELECT * FROM blog_posts WHERE id = ?', [id])
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
})

app.delete('/api/blog/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Identificador inválido' })
    }

    const user = await validateAuth(req)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    const [result] = await pool.query('DELETE FROM blog_posts WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Entrada no encontrada' })
    }

    res.json({ message: 'Entrada eliminada' })
  } catch (error) {
    next(error)
  }
})

app.post('/api/newsletter', async (req, res, next) => {
  try {
    const payload = newsletterSchema.parse(req.body)

    await pool.query(
      `INSERT INTO newsletter_subscribers (email)
       VALUES (:email)
       ON DUPLICATE KEY UPDATE email = VALUES(email)`,
      payload,
    )

    res.status(201).json({ message: 'Suscripción confirmada.' })
  } catch (error) {
    next(error)
  }
})

app.use((req, res) => {
  console.log(`[404] Ruta no encontrada: ${req.method} ${req.originalUrl}`)
  res.status(404).json({ message: 'Ruta no encontrada', path: req.originalUrl })
})

app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: 'Datos inválidos', errors: error.flatten() })
  }

  if (error instanceof Error && error.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ message: 'Origen no permitido' })
  }

  console.error('[API ERROR]', error)
  return res.status(500).json({ message: 'Error interno. Inténtalo más tarde.' })
})

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL,
      phone VARCHAR(60) NULL,
      company VARCHAR(160) NULL,
      services JSON NOT NULL,
      budget_range VARCHAR(80) NOT NULL,
      message TEXT NULL,
      source_ip VARCHAR(60) NULL,
      status VARCHAR(60) NOT NULL DEFAULT 'Nuevo',
      note TEXT NULL,
      assigned_to VARCHAR(160) NULL,
      last_contact_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_created_at (created_at),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  const databaseName = config.db.name

  const addColumnIfMissing = async (columnName, columnDefinition) => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'leads' AND COLUMN_NAME = :column`,
      { schema: databaseName, column: columnName },
    )

    if (rows[0]?.total === 0) {
      await pool.query(`ALTER TABLE leads ADD COLUMN ${columnDefinition}`)
    }
  }

  const addIndexIfMissing = async (indexName, indexDefinition) => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'leads' AND INDEX_NAME = :indexName`,
      { schema: databaseName, indexName },
    )

    if (rows[0]?.total === 0) {
      await pool.query(`ALTER TABLE leads ADD ${indexDefinition}`)
    }
  }

  await addColumnIfMissing('status', "status VARCHAR(60) NOT NULL DEFAULT 'Nuevo'")
  await addColumnIfMissing('note', 'note TEXT NULL')
  await addColumnIfMissing('assigned_to', 'assigned_to VARCHAR(160) NULL')
  await addColumnIfMissing('tags', 'tags JSON NULL')
  await addColumnIfMissing('last_contact_at', 'last_contact_at DATETIME NULL')
  await addColumnIfMissing(
    'updated_at',
    'updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  )
  await addIndexIfMissing('idx_status', 'INDEX idx_status (status)')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(160) NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(160) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_token (token),
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NULL,
      role VARCHAR(120) NULL,
      photo_url VARCHAR(255) NULL,
      can_manage_leads BOOLEAN NOT NULL DEFAULT TRUE,
      can_manage_tasks BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  const addTeamMemberColumnIfMissing = async (columnName, columnDefinition) => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'team_members' AND COLUMN_NAME = :column`,
      { schema: databaseName, column: columnName },
    )

    if (rows[0]?.total === 0) {
      await pool.query(`ALTER TABLE team_members ADD COLUMN ${columnDefinition}`)
    }
  }

  const dropTeamMemberColumnIfExists = async (columnName) => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'team_members' AND COLUMN_NAME = :column`,
      { schema: databaseName, column: columnName },
    )

    if (rows[0]?.total === 1) {
      await pool.query(`ALTER TABLE team_members DROP COLUMN ${columnName}`)
    }
  }

  // Clean up old columns no longer used
  await dropTeamMemberColumnIfExists('can_manage_leads')
  await dropTeamMemberColumnIfExists('can_manage_tasks')
  await dropTeamMemberColumnIfExists('access_leads')
  await dropTeamMemberColumnIfExists('access_team')
  await dropTeamMemberColumnIfExists('access_tasks')
  await dropTeamMemberColumnIfExists('access_brands')
  await dropTeamMemberColumnIfExists('access_blog')
  await dropTeamMemberColumnIfExists('is_super_admin')

  // Add columns if missing
  await addTeamMemberColumnIfMissing('photo_url', 'photo_url VARCHAR(255) NULL')
  await addTeamMemberColumnIfMissing('password_hash', 'password_hash VARCHAR(255) NULL')
  await addTeamMemberColumnIfMissing('is_admin', 'is_admin BOOLEAN NOT NULL DEFAULT FALSE')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS brands (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
      package VARCHAR(120) NULL,
      contact_info TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  const addBrandColumnIfMissing = async (columnName, columnDefinition) => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'brands' AND COLUMN_NAME = :column`,
      { schema: databaseName, column: columnName },
    )

    if (rows[0]?.total === 0) {
      await pool.query(`ALTER TABLE brands ADD COLUMN ${columnDefinition}`)
    }
  }

  await addBrandColumnIfMissing('package', 'package VARCHAR(120) NULL')
  await addBrandColumnIfMissing('contact_info', 'contact_info TEXT NULL')
  await addBrandColumnIfMissing('social_accounts', 'social_accounts JSON NULL')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_media_metrics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand_id INT NOT NULL,
      platform VARCHAR(50) NOT NULL,
      followers INT NOT NULL DEFAULT 0,
      engagement DECIMAL(5,2) NOT NULL DEFAULT 0,
      reach INT NOT NULL DEFAULT 0,
      impressions INT NOT NULL DEFAULT 0,
      metric_date DATE NOT NULL,
      metric_period ENUM('daily', 'weekly', 'monthly') NOT NULL DEFAULT 'daily',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
      INDEX idx_brand_platform (brand_id, platform),
      INDEX idx_metric_date (metric_date),
      UNIQUE KEY unique_brand_platform_date (brand_id, platform, metric_date, metric_period)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
      assigned_to INT NULL,
      brand_id INT NULL,
      due_date DATETIME NULL,
      start_date DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES team_members(id) ON DELETE SET NULL,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  const addTaskColumnIfMissing = async (columnName, columnDefinition) => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'tasks' AND COLUMN_NAME = :column`,
      { schema: databaseName, column: columnName },
    )

    if (rows[0]?.total === 0) {
      await pool.query(`ALTER TABLE tasks ADD COLUMN ${columnDefinition}`)
    }
  }

  await addTaskColumnIfMissing('brand_id', 'brand_id INT NULL')
  await addTaskColumnIfMissing('start_date', 'start_date DATETIME NULL')
  
  // Add foreign key if missing (simple check, might need more robust check in prod)
  try {
    await pool.query(`ALTER TABLE tasks ADD CONSTRAINT fk_tasks_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL`)
  } catch (e) {
    // Ignore if constraint already exists
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      image VARCHAR(500),
      excerpt TEXT,
      content LONGTEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      body LONGTEXT NOT NULL,
      variables JSON NULL,
      json_schema JSON NULL,
      created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      to_email VARCHAR(255) NOT NULL,
      template_id INT NULL,
      subject VARCHAR(255) NULL,
      body LONGTEXT NULL,
      variables JSON NULL,
      send_at DATETIME NOT NULL,
      status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
      error_text TEXT NULL,
      created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
      INDEX idx_send_at (send_at),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS section_settings (
      id INT PRIMARY KEY DEFAULT 1,
      leads BOOLEAN DEFAULT TRUE,
      team BOOLEAN DEFAULT TRUE,
      tasks BOOLEAN DEFAULT TRUE,
      brands BOOLEAN DEFAULT TRUE,
      blog BOOLEAN DEFAULT TRUE,
      emails BOOLEAN DEFAULT TRUE,
      social BOOLEAN DEFAULT TRUE,
      media BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Ensure columns exist on upgrades where the table was created before emails/social were added
  try {
    await pool.query(`ALTER TABLE section_settings ADD COLUMN IF NOT EXISTS emails BOOLEAN DEFAULT TRUE`)
    await pool.query(`ALTER TABLE section_settings ADD COLUMN IF NOT EXISTS social BOOLEAN DEFAULT TRUE`)
    await pool.query(`ALTER TABLE section_settings ADD COLUMN IF NOT EXISTS media BOOLEAN DEFAULT TRUE`)
  } catch (err) {
    // Ignore - some MySQL versions might not support IF NOT EXISTS on ADD COLUMN
    try {
      await pool.query(`ALTER TABLE section_settings ADD COLUMN emails BOOLEAN DEFAULT TRUE`)
    } catch (e) {
      // If column already exists or cannot be added, just log and continue
      console.debug('Could not add emails column to section_settings:', e?.message || e)
    }
    try {
      await pool.query(`ALTER TABLE section_settings ADD COLUMN social BOOLEAN DEFAULT TRUE`)
    } catch (e) {
      console.debug('Could not add social column to section_settings:', e?.message || e)
    }
    try {
      await pool.query(`ALTER TABLE section_settings ADD COLUMN media BOOLEAN DEFAULT TRUE`)
    } catch (e) {
      console.debug('Could not add media column to section_settings:', e?.message || e)
    }
  }

  // Initialize section_settings if empty
  const [sectionRows] = await pool.query('SELECT COUNT(*) as count FROM section_settings')
  if (sectionRows[0].count === 0) {
    await pool.query(`
      INSERT INTO section_settings (id, leads, team, tasks, brands, blog, emails, social, media)
      VALUES (1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
    `)
  }

  // Create media_assets table to store uploaded assets metadata
  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      file_name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(120) NULL,
      size INT NULL,
      url VARCHAR(512) NULL,
      created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Seed blog posts if empty
  const [blogRows] = await pool.query('SELECT COUNT(*) as count FROM blog_posts')
  if (blogRows[0].count === 0) {
    console.log('Seeding blog posts...')
    const initialPosts = [
      {
        id: 18,
        slug: "diseno-web-minimalista",
        title: "Minimalismo y velocidad: Tendencias web 2026",
        date: "2025-11-26",
        image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
        excerpt: "Menos es más. Sitios web limpios, tipografías grandes y carga instantánea son la norma hoy.",
        description: "Por qué el diseño web minimalista mejora la experiencia de usuario y el SEO.",
        content: `
          <p>El diseño web barroco y sobrecargado ha muerto. En 2026, la tendencia dominante es el "Minimalismo Funcional". No se trata solo de una estética blanca y vacía, sino de eliminar todo lo superfluo para que el contenido y la llamada a la acción sean los protagonistas absolutos. En un mundo de sobrecarga informativa, la claridad es el nuevo lujo.</p>

          <h3>Tipografía como Elemento Gráfico</h3>
          <p>Vemos un uso audaz de tipografías de gran tamaño (Macro-tipografía) que actúan casi como imágenes. Esto mejora la legibilidad en móviles y dota de personalidad a la web sin necesidad de cargar pesados archivos gráficos.</p>

          <h3>Espacio Negativo y Micro-interacciones</h3>
          <p>El uso generoso del espacio en blanco (espacio negativo) permite que la vista descanse y guía la atención del usuario. Para evitar que el sitio se sienta "aburrido", se añaden micro-interacciones sutiles: botones que reaccionan al cursor, transiciones suaves y efectos de scroll que dan vida a la interfaz sin ralentizarla.</p>

          <p>En <strong>Ethan Comunicaciones</strong> diseñamos sitios web que respiran. Priorizamos la velocidad de carga y la usabilidad, creando entornos digitales elegantes donde cada píxel tiene un propósito y la experiencia de usuario es fluida y placentera.</p>
        `
      },
      {
        id: 14,
        slug: "sostenibilidad-branding",
        title: "Sostenibilidad: De tendencia a exigencia de marca",
        date: "2025-11-20",
        image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
        excerpt: "Los consumidores eligen marcas con propósito. Comunicar tus valores sostenibles es vital en 2026.",
        description: "Cómo integrar y comunicar la sostenibilidad en tu estrategia de branding de manera auténtica.",
        content: `
          <p>La sostenibilidad ha dejado de ser un nicho para convertirse en un imperativo comercial. Las generaciones Z y Alpha, que ahora dominan el consumo, exigen transparencia radical y responsabilidad social a las empresas. No compran solo productos; compran valores. Una marca que ignora su impacto ambiental o social corre el riesgo de volverse irrelevante.</p>

          <h3>El Peligro del Greenwashing</h3>
          <p>Comunicar sostenibilidad es delicado. Los consumidores son expertos en detectar el "greenwashing" (falsas pretensiones ecológicas). La comunicación debe estar basada en hechos, datos y progresos reales, no en promesas vacías. Es mejor comunicar honestamente que estás en proceso de mejora que fingir ser perfecto.</p>

          <h3>Sostenibilidad como Diferenciador</h3>
          <p>Integrar prácticas sostenibles en tu cadena de suministro, packaging o cultura corporativa no es un gasto, es una inversión en branding. Las marcas con propósito claro suelen tener márgenes más altos y clientes más leales.</p>

          <p>En <strong>Ethan Comunicaciones</strong> te asesoramos para comunicar tus iniciativas de responsabilidad social corporativa (RSC) de manera efectiva y emotiva, conectando con los valores profundos de tu audiencia sin caer en oportunismos.</p>
        `
      },
      {
        id: 15,
        slug: "busqueda-por-voz-seo",
        title: "Optimización para búsqueda por voz: El futuro del SEO",
        date: "2025-11-15",
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
        excerpt: "Con el auge de los asistentes virtuales, la forma en que buscamos está cambiando. ¿Tu web está lista?",
        description: "Claves para optimizar tu sitio web para búsquedas por voz y asistentes virtuales.",
        content: `
          <p>Con la proliferación de altavoces inteligentes (Alexa, Google Home) y el uso constante de Siri en móviles, la búsqueda por voz representa ya una parte significativa del tráfico web. La forma en que hablamos es muy diferente a la forma en que escribimos, y esto cambia radicalmente las reglas del juego del SEO.</p>

          <h3>Keywords Conversacionales y Long-Tail</h3>
          <p>Cuando escribimos, buscamos "restaurante italiano centro". Cuando hablamos, decimos: "¿Cuál es el mejor restaurante italiano cerca de mí que esté abierto ahora?". Las estrategias de palabras clave deben adaptarse a frases más largas, naturales y en formato de pregunta.</p>

          <h3>La Importancia de los Fragmentos Destacados (Featured Snippets)</h3>
          <p>Los asistentes de voz suelen leer solo el primer resultado o el "fragmento destacado" de Google. Si tu web no está estructurada para responder preguntas de forma concisa y directa (usando Schema Markup y secciones de FAQ), serás invisible para la búsqueda por voz.</p>

          <p>Optimizamos la estructura semántica de tu web para que sea la mejor respuesta posible, asegurando que tu marca sea la que los asistentes virtuales recomienden a tus clientes potenciales.</p>
        `
      },
      {
        id: 11,
        slug: "inteligencia-artificial-marketing",
        title: "IA Generativa: El nuevo copiloto del marketing digital",
        date: "2025-11-05",
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80",
        excerpt: "La Inteligencia Artificial no viene a reemplazarnos, sino a potenciarnos. Descubre cómo usarla a tu favor.",
        description: "Cómo la IA generativa está transformando la creación de contenido y las estrategias de marketing en 2025.",
        content: `
          <p>La Inteligencia Artificial Generativa ha dejado de ser una curiosidad futurista para convertirse en una herramienta de trabajo diaria e indispensable en las agencias de marketing. Herramientas como ChatGPT, Midjourney, Claude y Sora han democratizado la creación de contenido de alta calidad, pero también han elevado el estándar. Ya no basta con crear; hay que crear con estrategia y criterio.</p>

          <h3>Eficiencia Operativa y Creatividad Aumentada</h3>
          <p>La IA nos permite automatizar tareas repetitivas como la redacción de variaciones de copy, la investigación de palabras clave o la edición básica de imágenes. Esto libera a los creativos humanos para que se concentren en lo que la IA aún no puede hacer: tener empatía, entender el contexto cultural profundo y generar estrategias disruptivas.</p>

          <h3>El Reto de la Autenticidad</h3>
          <p>Con tanto contenido generado por máquinas, el contenido humano se vuelve premium. El reto para las marcas en 2025 es utilizar la IA para potenciar sus capacidades sin perder su voz única. La supervisión humana es obligatoria para asegurar la veracidad, la ética y la alineación con los valores de la marca.</p>

          <p>En <strong>Ethan Comunicaciones</strong> integramos las herramientas de IA más avanzadas en nuestros flujos de trabajo para ofrecerte rapidez y precisión, pero siempre bajo una estricta dirección creativa humana que asegura que tu mensaje siga siendo auténtico y personal.</p>
        `
      },
      {
        id: 1,
        slug: "estrategias-marketing-digital-2025",
        title: "Estrategias efectivas de marketing digital en 2025",
        date: "2025-10-28",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
        excerpt: "El panorama digital evoluciona constantemente. Te mostramos las tácticas más efectivas para destacar tu marca este año.",
        description: "Descubre las estrategias más efectivas de marketing digital para 2025 con Ethan Comunicaciones.",
        content: `
          <p>El marketing digital en 2025 ha dejado de ser una opción para convertirse en el núcleo de cualquier estrategia comercial exitosa. Sin embargo, lo que funcionaba hace dos años ya no es suficiente. Hoy, el enfoque está centrado radicalmente en la <strong>personalización extrema</strong> y la <strong>autenticidad</strong>. Las marcas que destacan no son las que más publican, sino las que generan valor real y tangible para sus comunidades.</p>
          
          <h3>1. La Era de la Hiper-Personalización</h3>
          <p>Ya no basta con poner el nombre del cliente en un correo electrónico. La personalización en 2025 implica utilizar datos de comportamiento en tiempo real para ofrecer el contenido exacto, en el momento preciso y por el canal preferido. Herramientas de CDP (Customer Data Platforms) están permitiendo unificar la visión del cliente para crear experiencias fluidas y coherentes.</p>

          <h3>2. Automatización con Toque Humano</h3>
          <p>Entre las estrategias más efectivas encontramos la automatización de campañas y la creación de embudos de venta complejos. Sin embargo, el reto está en que esta automatización no se sienta robótica. El uso de inteligencia artificial para segmentar audiencias permite que los mensajes automatizados se sientan escritos a mano, aumentando significativamente las tasas de conversión.</p>

          <h3>3. Privacidad y First-Party Data</h3>
          <p>Con la desaparición progresiva de las cookies de terceros, la recopilación de datos propios (First-Party Data) es oro puro. Las estrategias de captación de leads deben ser más creativas y ofrecer un intercambio de valor claro: contenido exclusivo, herramientas gratuitas o acceso a comunidades a cambio de datos de contacto.</p>

          <p>En <strong>Ethan Comunicaciones</strong> implementamos estrategias integrales que combinan creatividad disruptiva con un riguroso análisis de datos, garantizando que cada acción digital tenga un propósito medible y resultados concretos para el crecimiento de tu negocio.</p>
        `
      },
      {
        id: 12,
        slug: "dominio-video-vertical",
        title: "El dominio absoluto del video vertical en 2025",
        date: "2025-10-15",
        image: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=800&q=80",
        excerpt: "TikTok, Reels y Shorts siguen reinando. Si tu marca no está creando video vertical, está perdiendo visibilidad.",
        description: "Por qué el video vertical es el formato rey en 2025 y cómo tu marca puede aprovecharlo.",
        content: `
          <p>Si una imagen vale más que mil palabras, un video vertical vale más que mil imágenes. El consumo de contenido en dispositivos móviles roza el 95% en redes sociales, y el formato vertical (9:16) es el único que aprovecha toda la pantalla, ofreciendo una experiencia inmersiva sin distracciones. TikTok, Instagram Reels y YouTube Shorts no son una moda pasajera; son el nuevo estándar de la comunicación digital.</p>

          <h3>La Economía de la Atención: Los Primeros 3 Segundos</h3>
          <p>La competencia es feroz. Tienes menos de 3 segundos (el tiempo que tarda un dedo en deslizar hacia arriba) para captar la atención del usuario. Esto ha cambiado la narrativa audiovisual: ya no hay introducciones lentas. Debemos empezar con un "gancho" visual o sonoro potente que obligue al espectador a quedarse.</p>

          <h3>Edutainment: Educar + Entretener</h3>
          <p>El contenido que mejor funciona es el que aporta valor de forma entretenida. Tutoriales rápidos, "hacks" del sector, detrás de cámaras y humor corporativo inteligente son formatos ganadores. La clave es la autenticidad; los videos demasiado producidos a veces generan menos confianza que un video grabado con el móvil por un empleado real.</p>

          <p>Nuestra área audiovisual se especializa en crear contenido vertical nativo, diseñado específicamente para los algoritmos actuales, optimizando tiempos de retención y fomentando la viralidad de tu marca.</p>
        `
      },
      {
        id: 13,
        slug: "ugc-contenido-generado-usuario",
        title: "UGC: Por qué tus clientes son tus mejores vendedores",
        date: "2025-10-02",
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
        excerpt: "El Contenido Generado por el Usuario (UGC) genera más confianza que cualquier anuncio. Aprende a incentivarlo.",
        description: "El poder del UGC en 2025: cómo convertir a tus clientes en embajadores de marca.",
        content: `
          <p>Vivimos en la era de la desconfianza institucional. Los consumidores ya no creen ciegamente en los anuncios corporativos; creen en personas como ellos. El Contenido Generado por el Usuario (UGC - User Generated Content) se ha convertido en el activo de marketing más valioso porque aporta la prueba social definitiva: alguien real usando y disfrutando tu producto.</p>

          <h3>De Clientes a Embajadores</h3>
          <p>El UGC incluye reseñas, fotos de unboxing, videos de uso y menciones en stories. Incentivar a tus clientes a crear este contenido es mucho más rentable que contratar modelos. Campañas de hashtags, concursos o simplemente repostear el contenido de tus seguidores (con su permiso) crea un ciclo virtuoso de lealtad y validación.</p>

          <h3>Autenticidad sobre Perfección</h3>
          <p>Un video tembloroso de un cliente feliz mostrando cómo tu producto resolvió su problema vende más que un spot de TV de 50.000 dólares. Las marcas deben perder el miedo a perder el control total de su imagen y abrazar la diversidad de voces de su comunidad.</p>

          <p>En <strong>Ethan Comunicaciones</strong> ayudamos a las marcas a diseñar estrategias para fomentar, curar y amplificar el UGC, transformando a tus clientes satisfechos en tu fuerza de ventas más potente y creíble.</p>
        `
      },
      {
        id: 2,
        slug: "identidad-visual-poderosa",
        title: "Cómo crear una identidad visual poderosa para tu marca",
        date: "2025-09-25",
        image: "https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=800&q=80",
        excerpt: "La primera impresión cuenta. Aprende a construir una identidad visual coherente y atractiva para tu negocio.",
        description: "Guía práctica para crear una identidad visual sólida que conecte con tu público objetivo.",
        content: `
          <p>Tu identidad visual comunica mucho más que un simple logotipo; es la cara visible de tu promesa de marca. Representa los valores, la esencia y el tono de tu negocio en una fracción de segundo. En un mercado saturado, una identidad visual poderosa es lo que hace que un consumidor te elija a ti sobre la competencia antes incluso de leer tu oferta.</p>

          <h3>La Psicología del Color y la Forma</h3>
          <p>Cada color evoca una emoción distinta. El azul transmite confianza y seguridad, el rojo pasión y urgencia, el verde crecimiento y salud. Elegir la paleta de colores correcta no es una decisión estética, es una decisión estratégica. Lo mismo ocurre con las tipografías y las formas; las líneas curvas sugieren amabilidad y flexibilidad, mientras que las rectas denotan seriedad y estabilidad.</p>

          <h3>Coherencia Omnicanal</h3>
          <p>El mayor error que cometen las marcas es la inconsistencia. Tu web, tus redes sociales, tus tarjetas de presentación y hasta la firma de tu correo deben hablar el mismo idioma visual. Esta repetición es la que construye la memoria de marca en la mente del consumidor.</p>

          <h3>El Manual de Marca: Tu Biblia Visual</h3>
          <p>En <strong>Ethan Comunicaciones</strong> desarrollamos manuales de marca exhaustivos que no solo definen el logo, sino el uso correcto de fotografías, iconos, espacios y tramas. Esto asegura consistencia visual en todos los puntos de contacto, reforzando el reconocimiento de marca y generando la confianza necesaria para fidelizar a tus clientes a largo plazo.</p>
        `
      },
      {
        id: 16,
        slug: "contenido-interactivo",
        title: "Contenido Interactivo: Adiós al consumo pasivo",
        date: "2025-09-10",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
        excerpt: "Cuestionarios, encuestas y calculadoras. El contenido que invita a la acción retiene más y convierte mejor.",
        description: "Beneficios del contenido interactivo para aumentar el engagement y la captación de leads.",
        content: `
          <p>El internet está lleno de texto estático que nadie lee. Para captar la atención y retenerla, necesitamos invitar al usuario a participar. El contenido interactivo transforma una experiencia pasiva de lectura en una conversación activa con la marca, aumentando exponencialmente el tiempo de permanencia en la página.</p>

          <h3>Tipos de Contenido que Convierten</h3>
          <p>Calculadoras de presupuesto, configuradores de producto, quizzes de personalidad ("¿Qué tipo de emprendedor eres?"), encuestas en tiempo real e infografías dinámicas son herramientas poderosas. No solo entretienen, sino que aportan valor personalizado al usuario de inmediato.</p>

          <h3>Data Zero-Party</h3>
          <p>Lo mejor del contenido interactivo es que el usuario te da información voluntariamente sobre sus preferencias y necesidades a cambio del resultado. Esto te permite segmentar tus futuras campañas de marketing con una precisión quirúrgica que ninguna cookie podría igualar.</p>

          <p>Desarrollamos experiencias digitales interactivas a medida que no solo informan, sino que divierten y convierten visitantes anónimos en leads cualificados y enriquecidos con datos valiosos.</p>
        `
      },
      {
        id: 3,
        slug: "tendencias-fotografia-video",
        title: "Tendencias en fotografía y video para redes sociales",
        date: "2025-08-28",
        image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
        excerpt: "Las redes sociales exigen contenido cada vez más dinámico. Descubre las tendencias visuales que están marcando el 2025.",
        description: "Descubre las principales tendencias en fotografía y video para redes sociales en 2025.",
        content: `
          <p>En 2025, el contenido visual no solo acompaña al texto, sino que lo ha reemplazado como el principal vehículo de comunicación. Las plataformas como TikTok, Instagram Reels y YouTube Shorts han dictado sentencia: el video es el rey. Pero no cualquier video; las audiencias exigen un estilo muy particular que mezcla calidad con autenticidad.</p>

          <h3>El Auge de lo "Aesthetic" y lo "Raw"</h3>
          <p>Vemos una dicotomía interesante. Por un lado, la estética "limpia" y minimalista sigue fuerte, pero por otro, el contenido "raw" (crudo), grabado con móvil y sin aparente edición, está ganando terreno por su capacidad de transmitir cercanía y realidad. Las marcas deben aprender a navegar entre estos dos mundos: producciones pulidas para imagen de marca y contenido espontáneo para conectar en el día a día.</p>

          <h3>Storytelling Visual en 9:16</h3>
          <p>El formato vertical ya no es una adaptación, es el estándar. Los creadores deben pensar en vertical desde la concepción de la idea. Esto implica encuadres más cerrados, textos integrados en zonas seguras y una narrativa visual que atrape en los primeros 3 segundos.</p>

          <p>En <strong>Ethan Comunicaciones</strong> producimos material audiovisual profesional que conserva la esencia de tu marca, equilibrando la creatividad artística con la estrategia comercial. Creamos piezas que no solo son bonitas de ver, sino que están diseñadas para detener el scroll y generar interacción.</p>
        `
      },
      {
        id: 17,
        slug: "social-commerce-ventas",
        title: "Social Commerce: Comprar sin salir de la App",
        date: "2025-08-15",
        image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80",
        excerpt: "Las redes sociales ya no son solo para ver fotos, son centros comerciales digitales. Facilita la compra.",
        description: "El auge del Social Commerce y cómo integrar tus catálogos en Instagram, TikTok y Facebook.",
        content: `
          <p>El Social Commerce es la evolución natural del e-commerce. Se trata de eliminar la fricción en el proceso de compra. Si un usuario descubre tu producto en Instagram, ¿por qué obligarlo a salir de la app, ir a tu web, buscar el producto y registrarse para comprar? Cada paso extra es una oportunidad de abandono.</p>

          <h3>Tiendas Integradas y Live Shopping</h3>
          <p>Plataformas como Instagram Shopping, TikTok Shop y Facebook Shops permiten etiquetar productos directamente en fotos y videos. Además, el "Live Shopping" (ventas en transmisiones en vivo) está explotando, permitiendo a las marcas demostrar productos y responder dudas en tiempo real, cerrando ventas al instante.</p>

          <h3>Confianza y Prueba Social Inmediata</h3>
          <p>Comprar en redes sociales permite al usuario ver los comentarios y likes de otros compradores en el mismo lugar donde está el botón de compra. Esta validación social inmediata reduce la incertidumbre y acelera la decisión de compra.</p>

          <p>Te asesoramos en la configuración técnica y la estrategia visual de tus tiendas en redes sociales para crear una experiencia de compra fluida, segura y altamente adictiva para tus seguidores.</p>
        `
      },
      {
        id: 4,
        slug: "desarrollo-web-para-marcas-modernas",
        title: "Desarrollo web estratégico para marcas modernas",
        date: "2025-07-30",
        image: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80",
        excerpt: "Tu sitio web es el centro de tu presencia digital. Aprende cómo optimizarlo para destacar frente a la competencia.",
        description: "Cómo crear un sitio web rápido, visual y estratégico que potencie tu marca en 2025.",
        content: `
          <p>En una era dominada por el contenido móvil, tu sitio web es mucho más que una tarjeta de visita digital; es tu oficina central abierta 24/7. Un sitio web moderno debe ser rápido, adaptable y, sobre todo, diseñado pensando en la conversión. El diseño UX/UI (Experiencia de Usuario e Interfaz de Usuario) juega un papel clave para guiar al visitante desde el interés hasta la acción.</p>

          <h3>Velocidad y Core Web Vitals</h3>
          <p>Google ha dejado claro que la velocidad es un factor de posicionamiento crítico. Los usuarios no esperan más de 2 segundos a que cargue una página. Tecnologías como React, Vite o Next.js permiten crear sitios web ultrarrápidos que ofrecen una experiencia similar a una aplicación nativa.</p>

          <h3>Diseño Mobile-First</h3>
          <p>Ya no diseñamos para escritorio y adaptamos a móvil. Diseñamos para móvil y escalamos a escritorio. La mayoría de tu tráfico vendrá de smartphones, por lo que los botones deben ser "dedo-amigables", los textos legibles sin zoom y los menús intuitivos.</p>

          <p>Desde <strong>Ethan Comunicaciones</strong> desarrollamos sitios web a medida, optimizados para SEO técnico, con tiempos de carga mínimos y una arquitectura escalable. Tu web no solo debe verse bien, debe ser una máquina de generar conversiones, con una estructura clara, llamados a la acción efectivos y una estrategia de contenido sólida.</p>
        `
      },
      {
        id: 19,
        slug: "auge-podcast-marketing",
        title: "El auge del Podcast como herramienta de marca",
        date: "2025-07-12",
        image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80",
        excerpt: "El audio está en su mejor momento. Un podcast puede posicionarte como autoridad en tu nicho.",
        description: "Cómo usar el podcasting para construir autoridad de marca y conectar con audiencias nicho.",
        content: `
          <p>El audio vive una segunda edad de oro. El podcasting se ha consolidado como uno de los canales más efectivos para construir autoridad y confianza. A diferencia del video o el texto, el audio es un formato de "acompañamiento"; la gente escucha podcasts mientras conduce, hace ejercicio o cocina, lo que permite tiempos de consumo mucho más largos (30-60 minutos) que cualquier otro medio digital.</p>

          <h3>La Intimidad de la Voz</h3>
          <p>La voz humana genera una conexión emocional única. Escuchar a alguien hablar con pasión sobre su industria crea una sensación de cercanía y credibilidad difícil de replicar. Para las marcas B2B, un podcast es una herramienta de networking brutal, permitiendo invitar a clientes potenciales o líderes del sector a charlar.</p>

          <h3>Branded Content Sonoro</h3>
          <p>No se trata de hacer un anuncio de 30 minutos. Se trata de crear contenido de valor que interese a tu audiencia, donde tu marca actúa como facilitadora o experta. Desde entrevistas y mesas redondas hasta ficciones sonoras, las posibilidades creativas son infinitas.</p>

          <p>Ofrecemos servicios integrales de producción de podcast: desde la conceptualización y el guion hasta la grabación técnica, edición y distribución en Spotify y Apple Podcasts, ayudándote a encontrar tu voz y amplificarla.</p>
        `
      },
      {
        id: 5,
        slug: "logistica-de-eventos-corporativos",
        title: "Cómo lograr una logística de eventos impecable",
        date: "2025-06-25",
        image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
        excerpt: "Los eventos son una poderosa herramienta de marketing. Te contamos cómo organizarlos sin contratiempos.",
        description: "Consejos prácticos para planear y ejecutar eventos exitosos que refuercen la imagen de tu marca.",
        content: `
          <p>La logística de eventos es un arte que combina creatividad, planificación militar y una ejecución precisa. Un evento corporativo exitoso puede catapultar la imagen de una marca, mientras que uno mal organizado puede dañarla seriamente. Cada detalle cuenta: desde la elección del venue y el montaje técnico hasta el catering y la experiencia del asistente.</p>

          <h3>Planificación y Pre-producción</h3>
          <p>El éxito de un evento se define meses antes de que empiece. La fase de pre-producción es crítica: definir objetivos, presupuesto, cronograma y proveedores. Es vital tener un "Plan B" (y un "Plan C") para cada aspecto crítico, como fallos eléctricos, ausencias de speakers o problemas climáticos.</p>

          <h3>Tecnología en Eventos</h3>
          <p>En 2025, los eventos son híbridos y tecnológicos. El uso de apps para el registro, códigos QR para la interacción, streaming de alta calidad para asistentes remotos y experiencias de realidad aumentada in-situ son estándares esperados por los asistentes.</p>

          <p>En <strong>Ethan Comunicaciones</strong> ofrecemos soluciones integrales para eventos corporativos, ferias y lanzamientos. Nos encargamos de todo el estrés logístico para que tú puedas concentrarte en tus invitados. Garantizamos una experiencia memorable, fluida y alineada perfectamente con los valores de tu marca.</p>
        `
      },
      {
        id: 20,
        slug: "micro-influencers-estrategia",
        title: "Micro-influencers: Nichos pequeños, grandes resultados",
        date: "2025-06-08",
        image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
        excerpt: "Olvídate de las celebridades. Los micro-influencers tienen audiencias más leales y mayor tasa de conversión.",
        description: "Por qué colaborar con micro-influencers es más rentable y efectivo para tu estrategia de marketing.",
        content: `
          <p>Durante años, las marcas persiguieron a las celebridades con millones de seguidores. Hoy, la burbuja ha estallado. Las marcas inteligentes están girando su presupuesto hacia los micro-influencers (creadores con entre 10k y 100k seguidores) y nano-influencers. ¿La razón? La confianza y el compromiso (engagement).</p>

          <h3>La Tasa de Engagement lo es Todo</h3>
          <p>A medida que una cuenta crece, su tasa de interacción suele bajar. Los micro-influencers mantienen una relación estrecha con su comunidad; responden comentarios, hacen directos y se sienten como "amigos expertos" más que como estrellas inalcanzables. Cuando recomiendan un producto, su audiencia escucha y confía.</p>

          <h3>Segmentación de Nicho y Coste-Efectividad</h3>
          <p>Colaborar con 10 micro-influencers de nichos específicos (ej. "fotografía de comida vegana") suele ser más barato y efectivo que pagar a una sola celebridad generalista. Permite atacar audiencias muy cualificadas con mensajes adaptados.</p>

          <p>Gestionamos campañas de Influencer Marketing con un enfoque basado en datos, seleccionando perfiles que realmente comparten los valores de tu marca y diseñando colaboraciones auténticas que generan ROI real, no solo likes.</p>
        `
      },
      {
        id: 6,
        slug: "gestion-de-redes-sociales-efectiva",
        title: "Gestión de redes sociales: más allá de publicar contenido",
        date: "2025-05-20",
        image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80",
        excerpt: "Publicar no es suficiente. Aprende a crear estrategias de redes sociales que conecten y conviertan.",
        description: "Cómo crear una estrategia de redes sociales efectiva con objetivos claros y contenido de valor.",
        content: `
          <p>Muchas marcas caen en el error de pensar que gestionar redes sociales es simplemente "subir fotos". Una buena estrategia de Social Media Management va mucho más allá: se trata de construir y nutrir una comunidad digital alrededor de tu marca. No se basa en la cantidad de publicaciones, sino en la calidad de las interacciones y la relevancia del contenido.</p>

          <h3>Escucha Activa y Community Management</h3>
          <p>Las redes son canales bidireccionales. Responder a los comentarios, gestionar las quejas con empatía y participar en las conversaciones del sector es vital. La "escucha social" (Social Listening) nos permite detectar tendencias, entender qué opinan realmente los usuarios de nuestra marca y anticiparnos a posibles crisis de reputación.</p>

          <h3>Métricas que Importan</h3>
          <p>Olvídate de las "métricas de vanidad" como el número de seguidores si estos no interactúan. En 2025, nos enfocamos en el Engagement Rate, el alcance real, los guardados y, sobre todo, el tráfico referido a la web y las conversiones generadas.</p>

          <p>En <strong>Ethan Comunicaciones</strong> creamos planes editoriales estratégicos basados en análisis de datos y psicología del consumidor. Nuestro objetivo es construir comunidades activas que no solo consuman tu contenido, sino que lo compartan, lo recomienden y se conviertan en verdaderos defensores de tu marca.</p>
        `
      },
      {
        id: 7,
        slug: "produccion-audiovisual-profesional",
        title: "Producción audiovisual profesional: del concepto al impacto",
        date: "2025-05-05",
        image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
        excerpt: "Conoce cómo transformar ideas creativas en producciones audiovisuales que impacten y comuniquen con propósito.",
        description: "Guía completa sobre cómo planificar y producir contenido audiovisual de alto impacto.",
        content: `
          <p>En un mundo saturado de ruido visual, la calidad de tu producción audiovisual es lo que marca la diferencia entre ser ignorado o ser recordado. Una buena producción no empieza cuando se enciende la cámara, sino mucho antes, con un concepto sólido y una narrativa clara. No se trata solo de grabar imágenes bonitas, sino de comunicar emociones y mensajes complejos de forma efectiva.</p>

          <h3>La Importancia del Guion y la Pre-producción</h3>
          <p>El guion es el plano de la casa. Sin un buen guion, no hay buena película. Definir el tono, el ritmo, los diálogos y la estructura visual antes del rodaje ahorra tiempo, dinero y asegura que el mensaje final sea coherente con los objetivos de marketing.</p>

          <h3>Iluminación y Sonido: Los Héroes Invisibles</h3>
          <p>El público puede perdonar una imagen ligeramente borrosa, pero nunca perdonará un mal audio. El sonido profesional y una iluminación intencional son lo que separa un video amateur de una pieza corporativa de alto nivel. La iluminación crea la atmósfera y dirige la atención del espectador.</p>

          <p>En <strong>Ethan Comunicaciones</strong> trabajamos con equipos de cine digital y profesionales experimentados para crear piezas audiovisuales —desde spots publicitarios hasta videos corporativos— que cuentan historias auténticas y elevan la percepción de valor de tu marca.</p>
        `
      },
      {
        id: 8,
        slug: "branding-estrategico-para-empresas",
        title: "Branding estratégico: el arte de construir marcas memorables",
        date: "2025-04-18",
        image: "https://images.unsplash.com/photo-1434626881859-194d67b2b86f?auto=format&fit=crop&w=800&q=80",
        excerpt: "El branding no se trata solo de diseño, sino de estrategia. Aprende a construir una marca con propósito.",
        description: "Descubre cómo desarrollar un branding estratégico que posicione tu marca en la mente del consumidor.",
        content: `
          <p>El branding a menudo se confunde con el diseño gráfico, pero es mucho más profundo. El branding estratégico es la unión de psicología, negocios y creatividad para construir una identidad que resuene en el mercado. Es la gestión de todos los activos que distinguen a tu empresa, desde tu nombre y logo hasta tu tono de voz y tus valores corporativos.</p>

          <h3>El Propósito de Marca (Brand Purpose)</h3>
          <p>Las marcas más exitosas de hoy son aquellas que tienen un "porqué" claro. Los consumidores, especialmente las generaciones más jóvenes, buscan conectar con empresas que comparten sus valores. Definir tu propósito más allá de ganar dinero es el primer paso para construir una marca con alma.</p>

          <h3>Storytelling Corporativo</h3>
          <p>Los datos convencen, pero las historias enamoran. El branding estratégico utiliza el storytelling para humanizar la marca, contando el viaje del héroe (que es el cliente, no la empresa) y cómo tu producto o servicio le ayuda a superar sus retos.</p>

          <p>Desde <strong>Ethan Comunicaciones</strong> ayudamos a definir la personalidad, el arquetipo y la narrativa de tu marca. Creamos coherencia entre lo que eres, lo que dices y lo que haces, logrando ese reconocimiento y lealtad que convierte a clientes ocasionales en fans incondicionales.</p>
        `
      },
      {
        id: 9,
        slug: "seo-para-marcas-creativas",
        title: "SEO para marcas creativas: cómo destacar en Google en 2025",
        date: "2025-04-02",
        image: "https://images.unsplash.com/photo-1571786256017-aee7a0c009b6?auto=format&fit=crop&w=800&q=80",
        excerpt: "El SEO no es solo para blogs técnicos. Aprende cómo posicionar tu marca creativa en buscadores de forma orgánica.",
        description: "Estrategias SEO actualizadas para mejorar la visibilidad de marcas creativas y proyectos audiovisuales.",
        content: `
          <p>Existe el mito de que el SEO (Search Engine Optimization) es solo para webs de texto o e-commerce técnicos. Nada más lejos de la realidad. Las marcas creativas, estudios de diseño y productoras audiovisuales necesitan SEO más que nadie para ser encontradas en un mar de competencia. La clave está en adaptar la estrategia técnica al contenido visual.</p>

          <h3>SEO de Imágenes y Video</h3>
          <p>Para una marca creativa, el portafolio es vital. Google no puede "ver" las imágenes como un humano, por lo que el uso correcto de etiquetas ALT, nombres de archivo descriptivos y sitemaps de imágenes es crucial. Además, con el auge de Google Discover y la búsqueda visual, tener tus activos multimedia optimizados es una ventaja competitiva enorme.</p>

          <h3>Intención de Búsqueda y Contenido de Valor</h3>
          <p>Ya no se trata de rellenar textos con palabras clave. Google premia el contenido que satisface la intención del usuario. Si alguien busca "producción de video corporativo", quiere ver ejemplos, precios y procesos, no un texto genérico. Estructurar tu web para responder a estas dudas es fundamental.</p>

          <p>En <strong>Ethan Comunicaciones</strong> optimizamos cada detalle técnico y de contenido, garantizando visibilidad en Google sin sacrificar la estética ni la experiencia de usuario. Hacemos que tu creatividad sea encontrada por quienes la están buscando.</p>
        `
      },
      {
        id: 10,
        slug: "marketing-de-experiencias",
        title: "Marketing de experiencias: conectar más allá de la publicidad",
        date: "2025-03-15",
        image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80",
        excerpt: "El marketing moderno busca emociones. Aprende cómo crear experiencias que conecten con tus clientes.",
        description: "Cómo aplicar estrategias de marketing de experiencias para generar vínculos duraderos con tus clientes.",
        content: `
          <p>En un mundo digital, las experiencias tangibles y sensoriales tienen más valor que nunca. El marketing experiencial (o engagement marketing) busca crear momentos memorables que involucren al consumidor de manera activa, generando una conexión emocional positiva que la publicidad tradicional no puede lograr.</p>

          <h3>Más allá del Producto: La Emoción</h3>
          <p>No vendes café, vendes el momento de despertar y el aroma de la mañana. El marketing de experiencias se centra en cómo se <em>siente</em> el cliente al interactuar con tu marca. Esto puede ser a través de eventos pop-up, instalaciones artísticas, un unboxing excepcional o una experiencia digital inmersiva.</p>

          <h3>El Poder del Recuerdo</h3>
          <p>Las emociones son el pegamento de la memoria. Si logras sorprender, divertir o emocionar a tu cliente, recordará tu marca mucho después de que la experiencia haya terminado. Además, las experiencias únicas son altamente "instagrameables", lo que genera contenido generado por el usuario (UGC) gratuito y auténtico.</p>

          <p>En <strong>Ethan Comunicaciones</strong> combinamos diseño, producción audiovisual y tecnología para crear experiencias de marca únicas. Diseñamos cada punto de contacto para despertar los sentidos y forjar vínculos duraderos entre tu marca y tu audiencia.</p>
        `
      }
    ]

    for (const post of initialPosts) {
      await pool.query(
        'INSERT INTO blog_posts (slug, title, date, image, excerpt, content, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [post.slug, post.title, post.date, post.image, post.excerpt, post.content, post.description]
      )
    }
    console.log('Blog posts seeded successfully')
  }

  // Seed an example email template if none exists
  const [emailCountRows] = await pool.query('SELECT COUNT(*) as count FROM email_templates')
  if (emailCountRows[0].count === 0) {
    console.log('Seeding example email template...')
    await pool.query(
      'INSERT INTO email_templates (name, subject, body, variables, json_schema, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [
        'Plantilla Bienvenida',
        'Bienvenido a Ethan Comunicaciones, {{name}}',
        '<p>Hola {{name}},</p><p>Gracias por contactar con <strong>Ethan Comunicaciones</strong>. Nos pondremos en contacto pronto.</p><p>Saludos,<br/>Equipo Ethan</p>',
        JSON.stringify({ name: 'Nombre del contacto' }),
        JSON.stringify({ type: 'object', properties: { name: { type: 'string' } } }),
        0,
      ]
    )
  }
}

async function bootstrap() {
  let retries = 5
  while (retries > 0) {
    try {
      await ensureTables()
      // Start scheduled email processor after tables exist
      try {
        startEmailProcessor()
        console.log('Email processor started')
      } catch (e) {
        console.error('Could not start email processor', e)
      }

      app.listen(config.port, () => {
        console.log(`API escuchando en puerto ${config.port}`)
      })
      break
    } catch (error) {
      console.error('No se pudo iniciar la API:', error)
      retries--
      if (retries === 0) {
        console.error('Se agotaron los intentos de conexión a la base de datos.')
        process.exit(1)
      }
      console.log(`Reintentando en 5 segundos... (${retries} intentos restantes)`)
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
}

bootstrap()
