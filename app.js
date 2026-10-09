/* ===================================================
   REGISTRO DE ASISTENCIA Y RIFA - POLITÉCNICO SUPERIOR
   =================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Validar que la configuración pública esté cargada
  if (!window.APP_CONFIG || !window.APP_CONFIG.SUPABASE_URL || !window.APP_CONFIG.SUPABASE_ANON_KEY) {
    console.error("Error: La configuración en config.js no está disponible o está incompleta.");
    return;
  }

  // 2. Inicializar el cliente público de Supabase
  const { createClient } = window.supabase;
  const supabase = createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY
  );

  // 3. Capturar elementos del HTML
  const form = document.getElementById("registration-form");
  const submitBtn = document.getElementById("submit-btn");
  const noticeBox = document.getElementById("notice");
  const resultCard = document.getElementById("result-card");
  const raffleDisplay = document.getElementById("raffle-number-display");

  if (!form) return;

  // Funciones auxiliares para mostrar mensajes en pantalla
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

    // Obtener valores ingresados
    const fullName = document.getElementById("fullName")?.value.trim();
    const documentId = document.getElementById("documentId")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const consent = document.getElementById("consent")?.checked;

    // Validaciones en cliente
    if (!fullName || !documentId || !email || !phone) {
      showNotice("Por favor completa todos los campos del formulario.", "warning");
      return;
    }

    if (!consent) {
      showNotice("Debes aceptar la autorización de tratamiento de datos.", "warning");
      return;
    }

    // Bloquear botón durante el procesamiento
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "Guardando registro...";

    try {
      // PASO A: Insertar los datos en la tabla 'attendees' de Supabase
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

      // Obtener el registro creado y el número de rifa asignado por la BD
      const registeredUser = data && data[0];
      const rawNumber = registeredUser?.raffle_number || registeredUser?.id || 1;
      
      // Formatear a 3 dígitos (ejemplo: 1 -> "001", 12 -> "012")
      const raffleNumber = String(rawNumber).padStart(3, "0");

      // PASO B: Actualizar la interfaz de usuario en pantalla
      if (raffleDisplay) raffleDisplay.textContent = raffleNumber;
      if (resultCard) resultCard.classList.remove("hidden");
      
      form.reset();
      showNotice("¡Registro exitoso! Tu lugar en la rifa ha sido reservado.", "success");

      // PASO C: Enviar el SMS mediante la Serverless Function de Vercel
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
          console.warn("Advertencia SMS:", smsData.error || "No se pudo entregar el mensaje.");
        } else {
          console.log("SMS enviado con éxito a través de Vercel:", smsData);
        }
      } catch (smsErr) {
        console.error("Error al intentar solicitar el envío del SMS:", smsErr);
      }

    } catch (err) {
      console.error("Error en la base de datos:", err);
      showNotice(`No se pudo completar el registro: ${err.message || 'Inténtalo de nuevo.'}`, "error");
    } finally {
      // Restaurar estado del botón
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});
