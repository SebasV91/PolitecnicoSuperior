/* ===================================================
   REGISTRO DE ASISTENCIA Y RIFA - POLITÉCNICO SUPERIOR
   =================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Validar configuración
  if (!window.APP_CONFIG || !window.APP_CONFIG.SUPABASE_URL || !window.APP_CONFIG.SUPABASE_ANON_KEY) {
    console.error("Error: La configuración en config.js no está disponible o está incompleta.");
    return;
  }

  // 2. Inicializar cliente de Supabase
  const { createClient } = window.supabase;
  const supabase = createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY
  );

  // 3. Capturar elementos del DOM
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

  // 4. Manejo del envío del formulario
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideNotice();

    const fullName = document.getElementById("fullName")?.value.trim();
    const documentId = document.getElementById("documentId")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const consent = document.getElementById("consent")?.checked;

    // Validación básica de campos vacíos
    if (!fullName || !documentId || !email || !phone) {
      showNotice("Por favor completa todos los campos obligatorios.", "warning");
      return;
    }

    if (!consent) {
      showNotice("Debes aceptar la autorización de tratamiento de datos.", "warning");
      return;
    }

    // Deshabilitar botón durante el proceso
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "Procesando registro...";

    try {
      // PASO A: Verificar si el documento o correo ya existen en Supabase
      const { data: existingUsers, error: checkError } = await supabase
        .from("attendees")
        .select("id")
        .eq("event_id", window.APP_CONFIG.EVENT_ID)
        .or(`document_id.eq.${documentId},email.eq.${email}`);

      if (checkError) {
        console.warn("Error al comprobar duplicados:", checkError);
      }

      if (existingUsers && existingUsers.length > 0) {
        showNotice("El documento de identidad o correo ya se encuentra registrado para este evento.", "warning");
        return;
      }

      // PASO B: Insertar el nuevo registro en Supabase
      const { data, error } = await supabase
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

      if (error) throw error;

      // PASO C: Obtener y formatear el código único para la rifa (ejemplo: 001, 002)
      const registeredUser = data && data[0];
      const rawNumber = registeredUser?.raffle_number || registeredUser?.id || 1;
      const raffleNumber = String(rawNumber).padStart(3, "0");

      // PASO D: Mostrar el resultado y limpiar formulario
      if (raffleDisplay) raffleDisplay.textContent = raffleNumber;
      if (resultCard) resultCard.classList.remove("hidden");

      form.reset();
      showNotice("¡Registro completado exitosamente! Guarda tu número de rifa.", "success");

    } catch (err) {
      console.error("Error en Supabase:", err);
      showNotice(`No se pudo completar el registro: ${err.message || "Inténtalo de nuevo."}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});
