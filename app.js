(() => {
  "use strict";

  const cfg = window.APP_CONFIG || {};
  const $ = (selector) => document.querySelector(selector);
  const form = $("#registration-form");
  const submitButton = $("#submit-button");
  const message = $("#form-message");
  const resultPanel = $("#result-panel");
  const numberNode = $("#raffle-number");
  let supabase = null;

  function showMessage(text, type = "info") {
    message.textContent = text;
    message.className = `notice ${type}`;
    message.classList.remove("hidden");
  }

  function hideMessage() {
    message.textContent = "";
    message.className = "notice hidden";
  }

  function isConfigured() {
    return cfg.SUPABASE_URL &&
      !cfg.SUPABASE_URL.includes("TU-PROYECTO") &&
      cfg.SUPABASE_ANON_KEY &&
      !cfg.SUPABASE_ANON_KEY.includes("TU_CLAVE") &&
      cfg.EVENT_ID &&
      !cfg.EVENT_ID.includes("PEGA-AQUI");
  }

  function normalizePhone(raw) {
    let digits = String(raw || "").replace(/\D/g, "");
    if (digits.startsWith("57") && digits.length === 12) digits = digits.slice(2);
    if (/^3\d{9}$/.test(digits)) return `+57${digits}`;
    return null;
  }

  function normalizeDocument(raw) {
    return String(raw || "").trim().replace(/[.\s-]/g, "");
  }

  function validateForm(data) {
    if (!data.full_name || data.full_name.length < 3) return "Escribe tu nombre completo.";
    if (!data.career) return "Escribe tu carrera o programa.";
    if (!Number.isInteger(data.age) || data.age < 1 || data.age > 120) return "Ingresa una edad válida.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Ingresa un correo electrónico válido.";
    if (!/^[a-zA-Z0-9]{5,30}$/.test(data.document_number)) return "Revisa el documento: usa entre 5 y 30 letras o números, sin puntos, espacios ni guiones.";
    if (!data.phone) return "Ingresa un celular colombiano válido de 10 dígitos.";
    if (!data.privacy_consent) return "Debes aceptar el aviso de tratamiento de datos para continuar.";
    return null;
  }

  function prettyError(error) {
    const text = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
    if (text.includes("unique_document_per_event") || text.includes("document_number")) {
      return "Este documento ya fue registrado en este evento.";
    }
    if (text.includes("unique_email_per_event") || text.includes("email")) {
      return "Este correo electrónico ya fue registrado en este evento.";
    }
    if (text.includes("unique_phone_per_event") || text.includes("phone")) {
      return "Este celular ya fue registrado en este evento.";
    }
    if (text.includes("event_not_active")) return "Las inscripciones para este evento están cerradas.";
    if (text.includes("duplicate") || text.includes("23505")) {
      return "Uno o más datos ya fueron ingresados. Verifica documento, correo y celular.";
    }
    return "No fue posible completar el registro. Revisa tu conexión e inténtalo una vez más. Si continúa, informa al organizador.";
  }

  async function init() {
    if (!isConfigured() || !window.supabase?.createClient) {
      $("#setup-warning").classList.remove("hidden");
      $("#event-status").textContent = "Configuración pendiente.";
      submitButton.disabled = true;
      return;
    }

    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const { data, error } = await supabase.rpc("get_public_event_status", {
      p_event_id: cfg.EVENT_ID
    });

    if (error || !data || data.length === 0) {
      $("#event-status").textContent = "No se pudo consultar el evento.";
      showMessage("No se pudo verificar el evento. Comprueba la configuración o contacta al organizador.", "error");
      submitButton.disabled = true;
      return;
    }

    const event = data[0];
    $("#page-title").textContent = event.name;
    $("#event-status").textContent = event.active
      ? "Inscripciones abiertas"
      : "Inscripciones cerradas";
    if (!event.active) {
      submitButton.disabled = true;
      showMessage("Este evento no está recibiendo registros en este momento.", "warning");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();
    resultPanel.classList.add("hidden");

    if (!supabase) {
      showMessage("La aplicación no está configurada todavía.", "error");
      return;
    }

    const fd = new FormData(form);
    const phone = normalizePhone(fd.get("phone"));
    const payload = {
      full_name: String(fd.get("full_name") || "").trim().replace(/\s+/g, " "),
      career: String(fd.get("career") || "").trim(),
      age: Number(fd.get("age")),
      email: String(fd.get("email") || "").trim().toLowerCase(),
      document_number: normalizeDocument(fd.get("document_number")),
      phone,
      privacy_consent: fd.get("privacy_consent") === "on"
    };

    const validationError = validateForm(payload);
    if (validationError) {
      showMessage(validationError, "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Registrando...";
    try {
      const { data, error } = await supabase.rpc("register_attendee", {
        p_event_id: cfg.EVENT_ID,
        p_full_name: payload.full_name,
        p_career: payload.career,
        p_age: payload.age,
        p_email: payload.email,
        p_document_number: payload.document_number,
        p_phone: payload.phone,
        p_privacy_consent: payload.privacy_consent
      });

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !row.raffle_number) throw new Error("Respuesta de registro incompleta");

      numberNode.textContent = String(row.raffle_number).padStart(3, "0");
      resultPanel.classList.remove("hidden");
      form.classList.add("hidden");
      showMessage("Registro realizado correctamente. Guarda tu número de participación.", "success");
      resultPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      showMessage(prettyError(error), "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Registrar asistencia";
    }
  });

  $("#copy-number").addEventListener("click", async () => {
    const number = numberNode.textContent;
    try {
      await navigator.clipboard.writeText(number);
      $("#copy-status").textContent = "Número copiado.";
    } catch {
      $("#copy-status").textContent = `Tu número es ${number}. Anótalo para conservarlo.`;
    }
  });

  init();
})();
