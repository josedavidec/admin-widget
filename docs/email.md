# Email templates and scheduled sending

This project includes a lightweight email templates manager and scheduled email sender.

## DB
A migration file is available at `server/migrations/001_create_email_templates_and_schedules.sql`.

Tables created:
- `email_templates` (id, name, subject, body, variables, json_schema, created_by, created_at, updated_at)
- `email_schedules` (id, to_email, template_id, subject, body, variables, send_at, status, error_text, created_by, created_at)

If you use the project's `ensureTables()` logic, these tables are auto-created on server start.

## API endpoints
- `GET /api/email-templates` — list templates (auth required)
- `POST /api/email-templates` — create template (auth required)
- `PUT /api/email-templates/:id` — update template (auth required)
- `DELETE /api/email-templates/:id` — delete template (auth required)
- `POST /api/email/send` — send immediately (auth required)
  - body: `{ to, templateId?, subject?, body?, variables? }`
- `POST /api/email/schedule` — schedule (auth required)
  - body: `{ to, templateId?, subject?, body?, variables?, sendAt }` (sendAt ISO datetime)

## SMTP configuration
Set the following env vars (see `server/.env`):

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="Tu Sitio" <noreply@tusitio.com>
```

If SMTP is not configured, the server will log the email payload to console instead of sending.

## Job runner
The server starts a simple scheduled processor that polls `email_schedules` every minute and sends any pending emails whose `send_at <= NOW()`.

In development you can run the API container (or `node server/src/index.js`) and the processor will start automatically.

## Frontend
A simple manager component is available at `src/components/admin/EmailTemplatesManager.tsx`. It fetches templates and allows creating/updating/deleting, sending test emails and scheduling sends.

To integrate it into the admin UI, import and render the component from `src/pages/AdminPage.tsx` where appropriate.
