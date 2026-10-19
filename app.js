document.addEventListener("DOMContentLoaded", () => {
  if (!window.APP_CONFIG || !window.APP_CONFIG.SUPABASE_URL || !window.APP_CONFIG.SUPABASE_ANON_KEY) {
    console.error("Error: Configuración de Supabase no detectada.");
    return;
  }

  const supabase = window.supabase.createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY
  );

  const form = document.getElementById("registration-form");
  const submitBtn = document.getElementById("submit-btn");
  const noticeBox = document.getElementById("notice");
  const resultCard = document.getElementById("result-card");
  const raffleDisplay = document.getElementById("raffle-number-display");
  const phoneInput = document.getElementById("phone");
  const whatsappInput = document.getElementById("whatsapp");

  // Restringir a solo números de 10 dígitos en tiempo real
  [phoneInput, whatsappInput].forEach(input => {
    if (input) {
      input.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
      });
    }
  });

  function showNotice(message, type = "info") {
    if (!noticeBox) return;
    noticeBox.className = `notice ${type}`;
    noticeBox.textContent = message;
    noticeBox.classList.remove("hidden");
  }

  function hideNotice() {
    if (noticeBox) noticeBox.classList.add("hidden");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideNotice();

    const fullName = document.getElementById("fullName")?.value.trim();
    const phone = phoneInput?.value.trim();
    const whatsapp = whatsappInput?.value.trim();
    const school = document.getElementById("school")?.value.trim();
    const gradeLevel = document.getElementById("gradeLevel")?.value;
    const program = document.getElementById("program")?.value;
    const consent = document.getElementById("consent")?.checked;

    if (!fullName || !phone || !whatsapp || !school || !gradeLevel || !program) {
      showNotice("Por favor completa todos los campos requeridos.", "warning");
      return;
    }

    // Validación estricta de 10 dígitos para celular y WhatsApp
    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      showNotice("El número celular debe tener exactamente 10 dígitos.", "warning");
      phoneInput.focus();
      return;
    }

    if (whatsapp.length !== 10 || !/^\d{10}$/.test(whatsapp)) {
      showNotice("El número de WhatsApp debe tener exactamente 10 dígitos.", "warning");
      whatsappInput.focus();
      return;
    }

    if (!consent) {
      showNotice("Debes aceptar el tratamiento de datos según la ley 1581 de 2012.", "warning");
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Verificando registro...";

    try {
      // Validar si el número celular ya fue registrado en este evento
      const { data: existing, error: checkError } = await supabase
        .from("attendees")
        .select("id")
        .eq("event_id", window.APP_CONFIG.EVENT_ID)
        .eq("phone", phone);

      if (checkError) throw new Error(checkError.message);

      if (existing && existing.length > 0) {
        showNotice("Este número celular ya fue registrado previamente en este evento.", "warning");
        return;
      }

      submitBtn.textContent = "Guardando...";

      // Registrar asistente con los nuevos campos
      const { data: inserted, error: insertError } = await supabase
        .from("attendees")
        .insert([
          {
            event_id: window.APP_CONFIG.EVENT_ID,
            full_name: fullName,
            phone: phone,
            whatsapp: whatsapp,
            school: school,
            grade_level: gradeLevel,
            program: program
          }
        ])
        .select();

      if (insertError) throw new Error(insertError.message);

      const record = inserted && inserted[0];
      const rawNumber = record?.raffle_number || 1;
      const formattedRaffleNumber = String(rawNumber).padStart(3, "0");

      if (raffleDisplay) raffleDisplay.textContent = formattedRaffleNumber;
      if (resultCard) resultCard.classList.remove("hidden");

      form.reset();
      showNotice("¡Registro completado exitosamente!", "success");

    } catch (err) {
      console.error("Error en el registro:", err);
      showNotice(`Error al procesar el registro: ${err.message || "Intenta nuevamente."}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});
