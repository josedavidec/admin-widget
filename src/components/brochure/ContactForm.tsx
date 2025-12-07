import { useState, useEffect } from "react";

import type { ChangeEvent, FormEvent } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

interface ContactFormProps {
  sectionId?: string | null;
}

export default function ContactForm({ sectionId }: ContactFormProps = {}) {
  const { t } = useTranslation();
  const resolvedSectionId =
    sectionId === null ? undefined : sectionId ?? "contacto";
  const initialFormData = {
    name: "",
    email: "",
    phone: "",
    company: "",
    project: "web",
    budget: "starter",
    timeline: "soon",
    message: "",
    contactPreference: "email",
    honeypot: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<
      Record<
        | "name"
        | "email"
        | "phone"
        | "budget"
        | "message"
        | "contactPreference",
        string
      >
    >
  >({});
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Auto-dismiss feedback después de 5 segundos
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), FEEDBACK_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Prevenir scroll cuando el modal está abierto (usar clase para minimizar reflow)
  useEffect(() => {
    const className = "calendar-modal-open";
    const root = document.documentElement;
    if (showCalendarModal) {
      root.classList.add(className);
    } else {
      root.classList.remove(className);
    }
    return () => {
      root.classList.remove(className);
    };
  }, [showCalendarModal]);

  const contactEmail = "Info@AgenciaEthanComunicaciones.com";
  const contactPhone = "+57 320 874 7317";
  const MIN_NAME_LENGTH = 2;
  const MIN_MESSAGE_LENGTH = 10;
  const FEEDBACK_AUTO_DISMISS_MS = 5000;

  const budgetOptions = Object.entries(
    (t("brochure.contact.form.budget.options", {
      returnObjects: true,
    }) as Record<string, string> | undefined) ?? {
      starter: "Hasta $5M COP",
      growth: "$5M - $15M COP",
      scale: "Más de $15M COP",
      custom: "Necesito una propuesta personalizada",
    }
  ).filter(([, label]) => Boolean(label));

  const formatPhoneValue = (input: string) => input.replace(/[^\d+()\s-]/g, "");

  const fieldValidators: Record<
    | "name"
    | "email"
    | "phone"
    | "budget"
    | "message"
    | "contactPreference",
    (value: string) => string
  > = {
    name: (value) =>
      value.trim().length >= MIN_NAME_LENGTH
        ? ""
        : t("brochure.contact.form.validation.name"),
    email: (value) => {
      const email = value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      return emailRegex.test(email)
        ? ""
        : t("brochure.contact.form.validation.email");
    },
    phone: (value) =>
      /^[+]?[-\s()\d]{7,}$/.test(value.trim())
        ? ""
        : t("brochure.contact.form.validation.phone"),
    budget: (value) =>
      value ? "" : t("brochure.contact.form.validation.budget"),
    message: (value) =>
      value.trim().length >= MIN_MESSAGE_LENGTH
        ? ""
        : t("brochure.contact.form.validation.message"),
    contactPreference: (value) =>
      value ? "" : t("brochure.contact.form.validation.contactPreference"),
  };

  const isFieldKey = (value: string): value is keyof typeof fieldValidators =>
    value in fieldValidators;

  const updateFieldError = (
    field: keyof typeof fieldValidators,
    value: string
  ) => {
    const error = fieldValidators[field](value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
    return error;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    const nextValue = name === "phone" ? formatPhoneValue(value) : value;
    setFormData((s) => ({ ...s, [name]: nextValue }));

    if (isFieldKey(name)) {
      updateFieldError(name, nextValue);
    }
  };

  const validateForm = () => {
    let hasErrors = false;
    (
      Object.keys(fieldValidators) as Array<keyof typeof fieldValidators>
    ).forEach((field) => {
      const error = updateFieldError(field, formData[field]);
      if (error) {
        hasErrors = true;
      }
    });
    return !hasErrors;
  };

  const resetForm = () => {
    setFormData({ ...initialFormData });
    setFieldErrors({});
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      setFeedback({
        type: "error",
        message: t("brochure.contact.form.validation.general"),
      });
      return;
    }

    if (formData.honeypot) {
      resetForm();
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      // Construir el mensaje con los campos adicionales que no están en el esquema base
      const fullMessage = [
        formData.message,
        formData.contactPreference ? `Preferencia: ${formData.contactPreference}` : '',
      ].filter(Boolean).join('\n');

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        services: [formData.project], // Convertir a array como espera el backend
        budgetRange: formData.budget,
        message: fullMessage
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      // El backend devuelve 201 Created si todo va bien
      if (res.ok) {
        setFeedback({
          type: "success",
          message: t("brochure.contact.form.success"),
        });
        resetForm();
      } else {
        setFeedback({
          type: "error",
          message: data.message || data.error || t("brochure.contact.form.error"),
        });
      }
    } catch (err) {
      console.error("Error sending contact:", err);
      setFeedback({
        type: "error",
        message: t("brochure.contact.form.connectionError"),
      });
    } finally {
      setLoading(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.44 },
    },
  };

  const schedulingOptions = [
    {
      key: "whatsapp",
      href: "https://wa.me/573208747317",
      external: true,
      title: t("brochure.contact.scheduling.options.whatsapp.title"),
      description: t(
        "brochure.contact.scheduling.options.whatsapp.description"
      ),
      action: t("brochure.contact.scheduling.options.whatsapp.action"),
    },
    {
      key: "calendar",
      href: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1055vtv_SAPkct7VuN_SZsjqfe4vcmxxbh8jaAML_pfBq1EhJPHodYAM48fjTzmBAXeJUNlMmh?gv=true",
      external: true,
      title: t("brochure.contact.scheduling.options.calendar.title"),
      description: t(
        "brochure.contact.scheduling.options.calendar.description"
      ),
      action: t("brochure.contact.scheduling.options.calendar.action"),
    },
  ];

  return (
    <motion.section
      id={resolvedSectionId ?? undefined}
      data-section-id={resolvedSectionId ?? undefined}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.12 }}
      className="py-16 px-4 sm:px-6 lg:px-8"
    >
      <motion.div variants={itemVariants} className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-linear-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
          {t("brochure.contact.title")}
        </h2>
        <p className="text-lg text-white/70 max-w-2xl mx-auto">
          {t("brochure.contact.scheduling.helper")}
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto space-y-12">
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {schedulingOptions.map((option) =>
              option.key === "calendar" ? (
                <button
                  key={option.key}
                  onClick={() => {
                    setIframeLoaded(false);
                    setShowCalendarModal(true);
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-6 text-left shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-500/20 hover:border-orange-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 w-full cursor-pointer"
                  aria-label={`${option.title} - ${option.action}`}
                >
                  <div className="absolute inset-0 bg-linear-to-br from-orange-500/0 to-orange-500/0 transition-all duration-300 group-hover:from-orange-500/5 group-hover:to-orange-600/10" />
                  <div className="relative">
                    <div className="flex items-start justify-between text-white mb-3">
                      <span className="text-xl font-bold">{option.title}</span>
                      <span
                        aria-hidden="true"
                        className="text-2xl transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:scale-110"
                      >
                        ↗
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-white/70 mb-4">
                      {option.description}
                    </p>
                    <span className="inline-flex items-center text-sm font-semibold text-orange-400 group-hover:text-orange-300 transition-colors">
                      {option.action}
                    </span>
                  </div>
                </button>
              ) : (
                <a
                  key={option.key}
                  href={option.href}
                  {...(option.external
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-6 text-left shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-500/20 hover:border-orange-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
                  aria-label={`${option.title} - ${option.action}`}
                >
                  <div className="absolute inset-0 bg-linear-to-br from-orange-500/0 to-orange-500/0 transition-all duration-300 group-hover:from-orange-500/5 group-hover:to-orange-600/10" />
                  <div className="relative">
                    <div className="flex items-start justify-between text-white mb-3">
                      <span className="text-xl font-bold">{option.title}</span>
                      <span
                        aria-hidden="true"
                        className="text-2xl transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:scale-110"
                      >
                        {option.external ? "↗" : "→"}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-white/70 mb-4">
                      {option.description}
                    </p>
                    <span className="inline-flex items-center text-sm font-semibold text-orange-400 group-hover:text-orange-300 transition-colors">
                      {option.action}
                    </span>
                  </div>
                </a>
              )
            )}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          <motion.div
            variants={itemVariants}
            className="md:col-span-1 rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-8 shadow-lg backdrop-blur-sm"
          >
            <div className="text-2xl font-bold mb-2 bg-linear-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              {t("brochure.contact.info.title")}
            </div>
            <div className="text-sm text-white/60 mb-6">
              {t("brochure.contact.info.subtitle")}
            </div>
            <div className="space-y-4 text-sm text-white/80">
              <div className="flex flex-col space-y-1">
                <span className="text-xs uppercase tracking-wider text-white/50 font-medium">
                  {t("brochure.contact.info.emailLabel")}
                </span>
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-orange-400 hover:text-orange-300 transition-colors break-all"
                >
                  {contactEmail}
                </a>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs uppercase tracking-wider text-white/50 font-medium">
                  {t("brochure.contact.info.phoneLabel")}
                </span>
                <a
                  href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                  className="text-orange-400 hover:text-orange-300 transition-colors"
                >
                  {contactPhone}
                </a>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs uppercase tracking-wider text-white/50 font-medium">
                  {t("brochure.contact.info.locationLabel")}
                </span>
                <span>{t("brochure.contact.info.location")}</span>
              </div>
            </div>
          </motion.div>

          <motion.form
            variants={itemVariants}
            id="contacto-form"
            onSubmit={handleSubmit}
            className="md:col-span-2 rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-8 shadow-lg backdrop-blur-sm space-y-6"
          >
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={(e) => updateFieldError("name", e.target.value)}
                  placeholder={t("brochure.contact.form.name")}
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white w-full placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200"
                  required
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "error-name" : undefined}
                  autoComplete="name"
                />
                {fieldErrors.name && (
                  <p
                    id="error-name"
                    className="text-xs text-red-400 mt-1.5 ml-1"
                  >
                    {fieldErrors.name}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={(e) => updateFieldError("email", e.target.value)}
                  placeholder={t("brochure.contact.form.email")}
                  type="email"
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white w-full placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200"
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? "error-email" : undefined
                  }
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <p
                    id="error-email"
                    className="text-xs text-red-400 mt-1.5 ml-1"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={(e) => updateFieldError("phone", e.target.value)}
                  placeholder={t("brochure.contact.form.phone")}
                  type="tel"
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white w-full placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200"
                  required
                  inputMode="tel"
                  pattern="[+0-9()\\s-]{7,}"
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={
                    fieldErrors.phone ? "error-phone" : undefined
                  }
                  autoComplete="tel"
                />
                {fieldErrors.phone && (
                  <p
                    id="error-phone"
                    className="text-xs text-red-400 mt-1.5 ml-1"
                  >
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col">
                <label htmlFor="company" className="sr-only">
                  {t("brochure.contact.form.company")}
                </label>
                <input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder={t("brochure.contact.form.companyPlaceholder")}
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white w-full placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200"
                  autoComplete="organization"
                />
              </div>
              <div>
                <label
                  htmlFor="project-select"
                  className="block text-xs uppercase tracking-wider text-white/50 font-medium mb-2"
                >
                  {t("brochure.contact.form.projectLabel")}
                </label>
                <select
                  id="project-select"
                  name="project"
                  value={formData.project}
                  onChange={handleChange}
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                >
                  <option value="web" className="bg-gray-900">
                    {t("brochure.contact.form.project.web")}
                  </option>
                  <option value="ecommerce" className="bg-gray-900">
                    {t("brochure.contact.form.project.ecommerce")}
                  </option>
                  <option value="video" className="bg-gray-900">
                    {t("brochure.contact.form.project.video")}
                  </option>
                  <option value="branding" className="bg-gray-900">
                    {t("brochure.contact.form.project.branding")}
                  </option>
                  <option value="other" className="bg-gray-900">
                    {t("brochure.contact.form.project.other")}
                  </option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="budget-select"
                  className="block text-xs uppercase tracking-wider text-white/50 font-medium mb-2"
                >
                  {t("brochure.contact.form.budget.label")}
                </label>
                <select
                  id="budget-select"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer"
                  aria-invalid={Boolean(fieldErrors.budget)}
                  aria-describedby={
                    fieldErrors.budget ? "error-budget" : undefined
                  }
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                >
                  {budgetOptions.map(([value, label]) => (
                    <option key={value} value={value} className="bg-gray-900">
                      {label}
                    </option>
                  ))}
                </select>
                {fieldErrors.budget && (
                  <p
                    id="error-budget"
                    className="mt-1.5 ml-1 text-xs text-red-400"
                  >
                    {fieldErrors.budget}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="contact-preference"
                  className="block text-xs uppercase tracking-wider text-white/50 font-medium mb-2"
                >
                  {t("brochure.contact.form.preference.label")}
                </label>
                <select
                  id="contact-preference"
                  name="contactPreference"
                  value={formData.contactPreference}
                  onChange={handleChange}
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer"
                  aria-invalid={Boolean(fieldErrors.contactPreference)}
                  aria-describedby={
                    fieldErrors.contactPreference
                      ? "error-contactPreference"
                      : undefined
                  }
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                >
                  <option value="email" className="bg-gray-900">
                    {t("brochure.contact.form.preference.email")}
                  </option>
                  <option value="whatsapp" className="bg-gray-900">
                    {t("brochure.contact.form.preference.whatsapp")}
                  </option>
                  <option value="call" className="bg-gray-900">
                    {t("brochure.contact.form.preference.call")}
                  </option>
                </select>
                {fieldErrors.contactPreference && (
                  <p
                    id="error-contactPreference"
                    className="mt-1.5 ml-1 text-xs text-red-400"
                  >
                    {fieldErrors.contactPreference}
                  </p>
                )}
              </div>
            </div>

            <input
              type="text"
              name="honeypot"
              value={formData.honeypot}
              onChange={handleChange}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              placeholder={t("brochure.contact.form.honeypot")}
            />

            <div>
              <label
                htmlFor="message-textarea"
                className="block text-xs uppercase tracking-wider text-white/50 font-medium mb-2"
              >
                {t("brochure.contact.form.message")}
              </label>
              <textarea
                id="message-textarea"
                name="message"
                value={formData.message}
                onChange={handleChange}
                onBlur={(e) => updateFieldError("message", e.target.value)}
                placeholder={t("brochure.contact.form.messagePlaceholder")}
                rows={5}
                className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white w-full placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 resize-none"
                required
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={
                  fieldErrors.message ? "error-message" : undefined
                }
              />
              {fieldErrors.message && (
                <p
                  id="error-message"
                  className="mt-1.5 ml-1 text-xs text-red-400"
                >
                  {fieldErrors.message}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`group relative overflow-hidden bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg shadow-orange-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/40 ${
                  loading
                    ? "opacity-75 cursor-not-allowed hover:scale-100"
                    : "hover:scale-105"
                }`}
                aria-busy={loading}
              >
                <span className="relative z-10 flex items-center gap-2 justify-center">
                  {loading && (
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {loading
                    ? t("brochure.contact.form.sending")
                    : t("brochure.contact.form.submit")}
                </span>
                {!loading && (
                  <span className="absolute inset-0 bg-linear-to-r from-orange-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </button>
              <div className="text-sm text-white/50 text-center sm:text-right flex flex-col gap-1">
                <span>{t("brochure.contact.form.whatsappHint")}</span>
                <span className="text-xs text-white/40">
                  {t("brochure.contact.form.privacy")}
                </span>
              </div>
            </div>

            {feedback && (
              <div
                role="status"
                aria-live="polite"
                className={`rounded-xl border px-5 py-4 text-sm font-medium shadow-lg ${
                  feedback.type === "success"
                    ? "border-emerald-400/40 bg-linear-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-100"
                    : "border-red-400/40 bg-linear-to-br from-red-500/20 to-red-600/10 text-red-100"
                }`}
              >
                {feedback.message}
              </div>
            )}
          </motion.form>
        </div>
      </div>

      {/* Modal del calendario */}
      {showCalendarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowCalendarModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCalendarModal(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
              aria-label="Cerrar modal"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="relative w-full h-[600px] bg-white/5">
              {!iframeLoaded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-linear-to-b from-white/3 to-white/6 p-6"
                  aria-hidden={!iframeLoaded}
                >
                  <svg
                    className="w-10 h-10 text-orange-400 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      strokeWidth="2"
                      className="opacity-25"
                    />
                    <path
                      d="M4 12a8 8 0 018-8"
                      strokeWidth="2"
                      className="opacity-75"
                    />
                  </svg>
                  <p className="text-sm text-white/80">
                    {t("brochure.contact.scheduling.loading")}
                  </p>
                </motion.div>
              )}

              <iframe
                src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1055vtv_SAPkct7VuN_SZsjqfe4vcmxxbh8jaAML_pfBq1EhJPHodYAM48fjTzmBAXeJUNlMmh?gv=true"
                className={`w-full h-full border-0 transition-opacity duration-300 ${
                  iframeLoaded ? "opacity-100" : "opacity-0"
                }`}
                title="Google Calendar Appointment Scheduling"
                loading="lazy"
                onLoad={() => setIframeLoaded(true)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </motion.section>
  );
}
