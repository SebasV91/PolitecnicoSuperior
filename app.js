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
    const documentId = document.getElementById("documentId")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const school = document.getElementById("school")?.value.trim();
    const gradeLevel = document.getElementById("gradeLevel")?.value;
    const program = document.getElementById("program")?.value;
    const consent = document.getElementById("consent")?.checked;

    if (!fullName || !documentId || !email || !phone || !school || !gradeLevel || !program) {
      showNotice("Por favor completa todos los campos y selecciona las opciones requeridas.", "warning");
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
      // Validar duplicados por cédula o correo para este evento
      const { data: existing, error: checkError } = await supabase
        .from("attendees")
        .select("id")
        .eq("event_id", window.APP_CONFIG.EVENT_ID)
        .or(`document_id.eq.${documentId},email.eq.${email}`);

      if (checkError) throw new Error(checkError.message);

      if (existing && existing.length > 0) {
        showNotice("Este número de documento o correo electrónico ya fue registrado en este evento.", "warning");
        return;
      }

      submitBtn.textContent = "Guardando...";

      // Registrar asistente incluyendo el nuevo campo "school"
      const { data: inserted, error: insertError } = await supabase
        .from("attendees")
        .insert([
          {
            event_id: window.APP_CONFIG.EVENT_ID,
            full_name: fullName,
            document_id: documentId,
            email: email,
            phone: phone,
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
