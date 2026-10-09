/* ===================================================
   REGISTRO DE ASISTENCIA Y RIFA - POLITÉCNICO SUPERIOR
   =================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Validar configuración
  if (!window.APP_CONFIG || !window.APP_CONFIG.SUPABASE_URL || !window.APP_CONFIG.SUPABASE_ANON_KEY) {
    console.error("Error: La configuración en config.js no está disponible o está incompleta.");
    return;
  }

  // 2. Inicializar Supabase
  const { createClient } = window.supabase;
  const supabase = createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY
  );

  // 3. Capturar elementos del DOM por ID
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

  // 4. Manejo del formulario
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideNotice();

    // Capturar datos de los campos
    const fullName = document.getElementById("fullName")?.value.trim();
    const documentId = document.getElementById("documentId")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const consent = document.getElementById("consent")?.checked;

    if (!fullName || !documentId || !email || !phone) {
      showNotice("Por favor completa todos los campos obligatorios.", "warning");
      return;
    }

    if (!consent) {
      showNotice("Debes aceptar la autorización de tratamiento de datos.", "warning");
      return;
    }

    // Bloquear botón durante la transacción
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "Guardando registro...";

    try {
      // PASO A: Insertar en Supabase
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

      // Obtener el número de rifa e imprimirlo a 3 dígitos (ej: 1 -> "001")
      const registeredUser = data && data[0];
      const rawNumber = registeredUser?.raffle_number || registeredUser?.id || 1;
      const raffleNumber = String(rawNumber).padStart(3, "0");

      // PASO B: Actualizar vista
      if (raffleDisplay) raffleDisplay.textContent = raffleNumber;
      if (resultCard) resultCard.classList.remove("hidden");
      
      form.reset();
      showNotice("¡Registro exitoso! Tu número ha sido asignado.", "success");

      // PASO C: Enviar SMS vía API Serverless de Vercel
      try {
        const smsResponse = await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone,
            raffleNumber: raffleNumber
          })
        });

        const smsData = await smsResponse.json();

        if (!smsResponse.ok) {
          console.warn("Advertencia al enviar SMS:", smsData.error || "No se pudo entregar.");
        } else {
          console.log("SMS enviado con éxito:", smsData);
        }
      } catch (smsErr) {
        console.error("Error conectando con la API de SMS:", smsErr);
      }

    } catch (err) {
      console.error("Error en Supabase:", err);
      showNotice(`No se pudo completar el registro: ${err.message || 'Inténtalo de nuevo.'}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});
