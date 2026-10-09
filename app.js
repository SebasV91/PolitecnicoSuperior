/* ===================================================
   REGISTRO Y RIFA - POLITÉCNICO SUPERIOR
   =================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Validar presencia de credenciales
  if (!window.APP_CONFIG || !window.APP_CONFIG.SUPABASE_URL || !window.APP_CONFIG.SUPABASE_ANON_KEY) {
    console.error("Error: Archivo config.js no configurado.");
    return;
  }

  // 2. Inicializar cliente cliente oficial de Supabase JS v2
  const supabase = window.supabase.createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY
  );

  // 3. Captura de elementos de la interfaz
  const form = document.getElementById("registration-form");
  const submitBtn = document.getElementById("submit-btn");
  const noticeBox = document.getElementById("notice");
  const resultCard = document.getElementById("result-card");
  const raffleDisplay = document.getElementById("raffle-number-display");

  if (!form) return;

  function showNotice(message, type = "info") {
    if (!noticeBox) return;
    noticeBox.className = `notice ${type}`;
    noticeBox.textContent = message;
    noticeBox.classList.remove("hidden");
  }

  function hideNotice() {
    if (noticeBox) noticeBox.classList.add("hidden");
  }

  // 4. Manejador de envío de formulario
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideNotice();

    const fullName = document.getElementById("fullName")?.value.trim();
    const documentId = document.getElementById("documentId")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const consent = document.getElementById("consent")?.checked;

    if (!fullName || !documentId || !email || !phone) {
      showNotice("Por favor completa todos los campos requeridos.", "warning");
      return;
    }

    if (!consent) {
      showNotice("Debes aceptar la autorización de tratamiento de datos.", "warning");
      return;
    }

    // Bloquear botón durante el procesamiento
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Verificando registro...";

    try {
      // A. Validar que documento o email no existan previamente para este evento
      const { data: existing, error: checkError } = await supabase
        .from("attendees")
        .select("id")
        .eq("event_id", window.APP_CONFIG.EVENT_ID)
        .or(`document_id.eq.${documentId},email.eq.${email}`);

      if (checkError) {
        throw new Error(checkError.message);
      }

      if (existing && existing.length > 0) {
        showNotice("Este número de documento o correo electrónico ya fue registrado previamente para este evento.", "warning");
        return;
      }

      submitBtn.textContent = "Guardando...";

      // B. Insertar nuevo registro
      const { data: inserted, error: insertError } = await supabase
        .from("attendees")
        .insert([
          {
            event_id: window.APP_CONFIG.EVENT_ID,
            full_name: fullName,
            document_id: documentId,
            email: email,
            phone: phone
          }
        ])
        .select();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // C. Obtener el número de rifa y formatearlo a 3 dígitos (ej: 001, 002)
      const record = inserted && inserted[0];
      const rawNumber = record?.raffle_number || record?.id || 1;
      const formattedRaffleNumber = String(rawNumber).padStart(3, "0");

      // D. Mostrar la tarjeta de resultado
      if (raffleDisplay) raffleDisplay.textContent = formattedRaffleNumber;
      if (resultCard) resultCard.classList.remove("hidden");

      form.reset();
      showNotice("¡Registro completado exitosamente!", "success");

    } catch (err) {
      console.error("Error en Supabase:", err);
      showNotice(`Error al procesar el registro: ${err.message || "Por favor intenta de nuevo."}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});
