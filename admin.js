(() => {
  "use strict";
  const cfg = window.APP_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const message = $("#admin-message");
  let client = null;
  let attendees = [];
  let events = [];

  function tell(text, type = "info") {
    message.textContent = text;
    message.className = `notice ${type}`;
    message.classList.remove("hidden");
  }
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[c]);
  }
  function configured() {
    return cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("TU-PROYECTO") &&
      cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("TU_CLAVE");
  }
  async function loadEvents() {
    const { data, error } = await client.rpc("admin_list_events");
    if (error) throw error;
    events = data || [];
    $("#event-select").innerHTML = events.map(e =>
      `<option value="${e.id}">${escapeHtml(e.name)}${e.active ? " (activo)" : ""}</option>`
    ).join("");
    if (!events.length) throw new Error("No hay eventos creados. Ejecuta el SQL y crea un evento.");
  }
  async function loadAttendees() {
    const eventId = $("#event-select").value;
    if (!eventId) return;
    const { data, error } = await client.rpc("admin_list_attendees", { p_event_id: eventId });
    if (error) throw error;
    attendees = data || [];
    $("#admin-event-name").textContent = events.find(e => e.id === eventId)?.name || "Evento";
    $("#admin-stats").textContent = `${attendees.length} participantes registrados`;
    renderRows();
  }
  function renderRows() {
    const q = $("#search-box").value.trim().toLowerCase();
    const filtered = attendees.filter(a =>
      [a.full_name, a.document_number, String(a.raffle_number), a.email, a.phone]
        .some(v => String(v || "").toLowerCase().includes(q))
    );
    $("#attendee-rows").innerHTML = filtered.map(a => `<tr>
      <td style="padding:10px;border-bottom:1px solid #eef0f5;font-weight:700">${String(a.raffle_number).padStart(3,"0")}</td>
      <td style="padding:10px;border-bottom:1px solid #eef0f5">${escapeHtml(a.full_name)}</td>
      <td style="padding:10px;border-bottom:1px solid #eef0f5">${escapeHtml(a.document_number)}</td>
      <td style="padding:10px;border-bottom:1px solid #eef0f5">${escapeHtml(a.email)}</td>
      <td style="padding:10px;border-bottom:1px solid #eef0f5">${escapeHtml(a.phone)}</td>
      <td style="padding:10px;border-bottom:1px solid #eef0f5">${new Date(a.registered_at).toLocaleString("es-CO")}</td>
    </tr>`).join("") || '<tr><td colspan="6" style="padding:12px">No hay resultados.</td></tr>';
  }
  async function showDashboard() {
    await loadEvents();
    await loadAttendees();
    $("#dashboard").classList.remove("hidden");
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!configured()) return tell("Configura config.js antes de iniciar sesión.", "error");
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const { error } = await client.auth.signInWithPassword({
      email: $("#admin-email").value.trim(),
      password: $("#admin-password").value
    });
    if (error) return tell("No se pudo iniciar sesión. Verifica las credenciales y que el usuario esté autorizado.", "error");
    try {
      await showDashboard();
      $("#login-form").classList.add("hidden");
      tell("Sesión iniciada correctamente.", "success");
    } catch (err) {
      tell(`Error cargando el panel: ${err.message || "verifica la instalación SQL"}`, "error");
    }
  });
  $("#logout-button").addEventListener("click", async () => {
    if (client) await client.auth.signOut();
    $("#dashboard").classList.add("hidden");
    $("#login-form").classList.remove("hidden");
    tell("Sesión cerrada.");
  });
  $("#refresh-button").addEventListener("click", async () => {
    try { await loadAttendees(); tell("Lista actualizada.", "success"); }
    catch (err) { tell(err.message || "No se pudo actualizar.", "error"); }
  });
  $("#event-select").addEventListener("change", async () => {
    try { await loadAttendees(); } catch (err) { tell(err.message, "error"); }
  });
  $("#search-box").addEventListener("input", renderRows);
  $("#export-button").addEventListener("click", () => {
    const headers = ["Número rifa","Nombre completo","Carrera","Edad","Correo","Documento","Celular","Fecha registro"];
    const rows = attendees.map(a => [a.raffle_number,a.full_name,a.career,a.age,a.email,a.document_number,a.phone,a.registered_at]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "asistencia-rifa.csv";
    link.click();
    URL.revokeObjectURL(url);
  });
})();
