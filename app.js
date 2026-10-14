(function () {
  // =======================================================
  // CONFIGURATION
  // =======================================================
  const SUPABASE_URL = "https://ouvzssfsgwyoolxmboci.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnpzc2ZzZ3d5b29seG1ib2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MTQ1NjgsImV4cCI6MjEwNTE5MDU2OH0.YWGNuqBe8DBLJJVp8Apxxl1LIyjOBV3rTbAboENx9-c";
  // =======================================================

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const DEPARTMENTS = {
    "Hal Ehwal Murid (HEM)": [
      "Sahsiah & SSDM", "Bimbingan & Kaunseling", "Pengurusan Asrama", "Bantuan", "SPBT (Buku Teks)",
      "PPDA (Pencegahan Dadah)", "KRMJ (Karakter Johor)", "JSLC", "RMT (Makanan Tambahan)", "Program 3K"
    ],
    "Pembangunan Bakat Murid": [
      "Badan Beruniform", "Kesenian & Kebudayaan", "Pusat Kokurikulum", "Generasi MADANI",
      "Pengurusan Sukan", "Ko-akademik (Bahasa)", "Inovasi & STEM", "Kelab & Persatuan",
      "Southern Volunteer", "Koperasi Sekolah"
    ]
  };

  const UNIFORM_UNITS = {
    "Sekolah Rendah": [
      "Bulan Sabit Merah Malaysia (BSMM)",
      "Kadet Bomba Junior",
      "Persekutuan Pengakap Malaysia (Pengakap Kanak-kanak)",
      "Pandu Puteri Tunas",
      "St. John Ambulans Malaysia (SJAM)",
      "Tunas Kadet Remaja Sekolah (TKRS)"
    ],
    "Sekolah Menengah": [
      "Bulan Sabit Merah Malaysia (BSMM)",
      "Kadet Remaja Sekolah (KRS)",
      "Pasukan Kadet Pertahanan Awam (KASPA)",
      "Persekutuan Pengakap Malaysia (Pengakap Muda & Remaja)",
      "Persatuan Puteri Islam Malaysia (PPIM)",
      "Pertubuhan Kadet Bomba & Penyelamat Malaysia",
      "Pertubuhan Kadet Polis Malaysia",
      "St. John Ambulans Malaysia (SJAM)"
    ]
  };

  const root = document.getElementById("spm-app");

  let view = { screen: "home" };
  let resources = [];
  let searchQuery = "";
  let editingResource = null;
  let pendingDeleteId = null;

  // ---------- Custom Alert Dialog ----------
  window.showSiscAlert = function(msg) {
    document.getElementById("siscAlertText").innerText = msg;
    document.getElementById("siscSystemAlert").classList.add("show");
  };
  window.closeSiscAlert = function() {
    document.getElementById("siscSystemAlert").classList.remove("show");
  };

  // ---------- Custom Confirm Dialog ----------
  window.requestDeleteResource = function(id) {
    pendingDeleteId = id;
    document.getElementById("siscConfirmModal").classList.add("show");
  };
  window.closeConfirmModal = function() {
    pendingDeleteId = null;
    document.getElementById("siscConfirmModal").classList.remove("show");
  };
  window.executeDelete = async function() {
    if (!pendingDeleteId) return;
    const idToDelete = pendingDeleteId;
    window.closeConfirmModal();

    const { error } = await sb.from("resources").delete().eq("id", idToDelete);
    if (error) { 
      showSiscAlert("Gagal memadam: " + error.message); 
      return; 
    }
    await loadResources(view.branch, view.department);
    render();
  };

  // ---------- Google Drive Thumbnail Extraction ----------
  function getDriveThumbnailUrl(driveUrl) {
    if (!driveUrl) return null;
    const match = driveUrl.match(/[?&]id=([^&]+)/) || driveUrl.match(/\/d\/([^/]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600`;
    }
    return null;
  }

  // ---------- Database Operations ----------
  async function loadResources(branch, department) {
    const { data, error } = await sb
      .from("resources")
      .select("*")
      .eq("branch", branch)
      .eq("department", department)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      resources = [];
      showSiscAlert("Gagal memuatkan data dari pangkalan data.");
      return;
    }
    resources = data;
  }

  async function saveResource(fields) {
    const payload = {
      branch: view.branch,
      department: view.department,
      title: fields.title,
      link: fields.link,
      year: fields.year ? Number(fields.year) : null
    };

    if (editingResource) {
      payload.last_edited_by = fields.author || "Staf PPD";
      payload.last_edited_at = new Date().toISOString();
      const { error } = await sb.from("resources").update(payload).eq("id", editingResource.id);
      if (error) { showSiscAlert("Gagal kemaskini: " + error.message); return; }
    } else {
      payload.uploaded_by = fields.author || "Staf PPD";
      const { error } = await sb.from("resources").insert(payload);
      if (error) { showSiscAlert("Gagal menambah: " + error.message); return; }
    }

    editingResource = null;
    await loadResources(view.branch, view.department);
    render();
  }

  // ---------- Navigation Helpers ----------
  function goHome() { view = { screen: "home" }; render(); }
  function goBranch(branch) { view = { screen: "departments", branch }; render(); }
  function goDepartment(department) {
    if (department === "Badan Beruniform") {
      view = { screen: "uniformLevels", branch: view.branch, department };
      render();
      return;
    }
    goDashboard(department);
  }
  function goUniformLevel(level) {
    view = { screen: "uniformUnits", branch: view.branch, department: "Badan Beruniform", level };
    render();
  }
  async function goUniformUnit(unit) {
    const level = view.level;
    const department = `Badan Beruniform | ${level} | ${unit}`;
    searchQuery = "";
    view = { screen: "dashboard", branch: view.branch, department, category: "Badan Beruniform", level, unit };
    render();
    await loadResources(view.branch, department);
    render();
  }
  async function goDashboard(department) {
    searchQuery = "";
    view = { screen: "dashboard", branch: view.branch, department };
    render();
    await loadResources(view.branch, department);
    render();
  }

  // ---------- Helper Escaping ----------
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  // ---------- Render Layouts ----------
  function header() {
    return `
      <header class="header">
        <h1>SEKTOR PEMBANGUNAN MURID</h1>
        <p>Pejabat Pendidikan Daerah Muar</p>
      </header>`;
  }

  function crumb() {
    if (view.screen === "home") return "";
    const parts = [`<span class="step" onclick="window.__spmGoHome()">Utama</span>`];
    if (view.branch) parts.push(`<span class="sep">/</span><span class="step" onclick="window.__spmGoBranch('${esc(view.branch)}')">${esc(view.branch)}</span>`);
    if (view.category || view.department === "Badan Beruniform") {
      parts.push(`<span class="sep">/</span><span class="step" onclick="window.__spmGoDepartment('Badan Beruniform')">Badan Beruniform</span>`);
      if (view.level) {
        parts.push(`<span class="sep">/</span><span class="step" onclick="window.__spmGoUniformLevel('${esc(view.level)}')">${esc(view.level)}</span>`);
      }
      if (view.unit) parts.push(`<span class="sep">/</span><span>${esc(view.unit)}</span>`);
    } else if (view.department) {
      parts.push(`<span class="sep">/</span><span>${esc(view.department)}</span>`);
    }
    return `<div class="spm-crumb">${parts.join("")}</div>`;
  }

  function screenHome() {
    return `
      <div class="spm-main">
        <div class="hero-about">
          <h2>SEKTOR PEMBANGUNAN MURID (SPM)</h2>
          <p>Memperkasa sahsiah, hal ehwal murid, serta pembangunan bakat murid PPD Muar secara berstruktur dan digital selaras dengan aspirasi Kementerian Pendidikan Malaysia.</p>
        </div>
        <div class="choose-title">
          <h2>PILIH BAHAGIAN UTAMA</h2>
          <p>Sila pilih kategori bahagian di bawah</p>
        </div>
        <div class="cards-grid">
          <div class="branch-card" onclick="window.__spmGoBranch('Hal Ehwal Murid (HEM)')">
            <h3>HAL EHWAL MURID (HEM)</h3>
            <small>10 Sub-bahagian Pengurusan HEM</small>
          </div>
          <div class="branch-card" onclick="window.__spmGoBranch('Pembangunan Bakat Murid')">
            <h3>PEMBANGUNAN BAKAT MURID</h3>
            <small>10 Sub-bahagian Kokurikulum & Sukan</small>
          </div>
        </div>
      </div>`;
  }

  function screenDepartments() {
    const depts = DEPARTMENTS[view.branch] || [];
    return `
      <div class="spm-main">
        <div class="choose-title">
          <h2>${esc(view.branch)}</h2>
          <p>Sila pilih sub-bahagian untuk menguruskan dokumen / pautan</p>
        </div>
        <div class="dept-grid">
          ${depts.map(d => `<div class="dept-card" onclick="window.__spmGoDepartment('${esc(d)}')">${esc(d)}</div>`).join("")}
        </div>
      </div>`;
  }

  function screenUniformLevels() {
    return `
      <div class="spm-main">
        <div class="choose-title">
          <h2>BADAN BERUNIFORM</h2>
          <p>Sila pilih peringkat sekolah</p>
        </div>
        <div class="cards-grid">
          ${["Sekolah Rendah", "Sekolah Menengah"].map(level => `
            <div class="branch-card" onclick="window.__spmGoUniformLevel('${esc(level)}')">
              <h3>${esc(level.toUpperCase())}</h3>
              <small>Pilih unit beruniform</small>
            </div>`).join("")}
        </div>
      </div>`;
  }

  function screenUniformUnits() {
    const units = UNIFORM_UNITS[view.level] || [];
    const levels = ["Sekolah Rendah", "Sekolah Menengah"];
    return `
      <div class="spm-main">
        <div class="uniform-level-switch" role="group" aria-label="Pilih peringkat sekolah">
          ${levels.map(level => `
            <button
              class="uniform-level-option${level === view.level ? " is-active" : ""}"
              type="button"
              aria-pressed="${level === view.level}"
              onclick="window.__spmGoUniformLevel('${esc(level)}')">
              ${esc(level)}
            </button>`).join("")}
        </div>
        <div class="choose-title">
          <h2>${esc(view.level)}</h2>
          <p>Sila pilih unit beruniform untuk melihat atau memuat naik pautan</p>
        </div>
        <div class="dept-grid">
          ${units.map(unit => `
            <div class="dept-card" onclick="window.__spmGoUniformUnit('${esc(unit)}')">${esc(unit)}</div>`).join("")}
        </div>
      </div>`;
  }

  function screenDashboard() {
    const filtered = resources.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const cards = filtered.map(r => {
      const thumbUrl = getDriveThumbnailUrl(r.link);
      const safeId = typeof r.id === 'string' ? `'${r.id}'` : r.id;
      return `
        <div class="activity-card">
          <div class="activity-image">
            ${thumbUrl ? `<img src="${esc(thumbUrl)}" alt="Preview" onerror="this.style.display='none'">` : `<span style="font-size:12px;color:var(--muted);font-weight:700;">GOOGLE DRIVE LINK</span>`}
          </div>
          <div class="activity-body">
            <h3><a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a></h3>
            <div class="activity-meta">
              ${r.year ? `Tahun: <strong>${esc(r.year)}</strong><br>` : ""}
              Muat naik: ${esc(r.uploaded_by || "Staf PPD")}
              ${r.last_edited_by ? `<br><em>Kemaskini: ${esc(r.last_edited_by)}</em>` : ""}
            </div>
            <div class="activity-actions">
              <button onclick="window.__spmEdit(${safeId})">Edit</button>
              <button class="btn-del" onclick="window.requestDeleteResource(${safeId})">Padam</button>
            </div>
          </div>
        </div>`;
    }).join("");

    return `
      <div class="spm-main">
        <div class="toolbar">
          <div class="toolbar-title">
            <h2>${esc(view.unit || view.department)}</h2>
            <p>${esc(view.category ? `${view.branch} / ${view.category} / ${view.level}` : view.branch)}</p>
          </div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <input type="text" class="search-input" placeholder="Cari tajuk..." value="${esc(searchQuery)}" oninput="window.__spmOnSearch(this.value)">
            <button class="btn-add" onclick="window.__spmOpenModal()">+ Tambah Pautan</button>
          </div>
        </div>
        <div class="activity-gallery">
          ${cards || `<div class="activity-empty">Tiada pautan fail dijumpai. Klik "+ Tambah Pautan" untuk memulakan.</div>`}
        </div>
      </div>
      ${editingResource !== undefined && view.showModal ? modal() : ""}`;
  }

  function modal() {
    const r = editingResource;
    return `
      <div class="modal-overlay" onclick="if(event.target===this) window.__spmCloseModal()">
        <div class="modal-box">
          <h3>${r ? "KEMASKINI PAUTAN" : "TAMBAH PAUTAN BAHARU"}</h3>
          <div class="modal-field">
            <label>Tajuk Dokumen / Fail</label>
            <input id="f-title" value="${r ? esc(r.title) : ""}" placeholder="Contoh: Modul Pengurusan 2026">
          </div>
          <div class="modal-field">
            <label>Pautan Google Drive</label>
            <input id="f-link" value="${r ? esc(r.link) : ""}" placeholder="https://drive.google.com/file/d/...">
          </div>
          <div class="modal-field">
            <label>Nama Pegawai / Staf</label>
            <input id="f-author" value="${r ? esc(r.uploaded_by || "") : ""}" placeholder="Contoh: En. Ahmad">
          </div>
          <div class="modal-field">
            <label>Tahun (Pilihan)</label>
            <input id="f-year" type="number" value="${r && r.year ? r.year : ""}" placeholder="2026">
          </div>
          <div class="modal-actions">
            <button onclick="window.__spmCloseModal()">BATAL</button>
            <button class="btn-save" onclick="window.__spmSaveModal()">SIMPAN</button>
          </div>
        </div>
      </div>`;
  }

  function render() {
    let html = header() + crumb();
    if (view.screen === "home") html += screenHome();
    else if (view.screen === "departments") html += screenDepartments();
    else if (view.screen === "uniformLevels") html += screenUniformLevels();
    else if (view.screen === "uniformUnits") html += screenUniformUnits();
    else if (view.screen === "dashboard") html += screenDashboard();

    html += `
      <footer class="home-footer">
        <strong>SEKTOR PEMBANGUNAN MURID — PPD MUAR</strong>
        Hal Ehwal Murid • Pembangunan Bakat Murid
      </footer>`;

    root.innerHTML = html;
  }

  // ---------- Window Handlers ----------
  window.__spmGoHome = goHome;
  window.__spmGoBranch = goBranch;
  window.__spmGoDashboard = goDashboard;
  window.__spmGoDepartment = goDepartment;
  window.__spmGoUniformLevel = goUniformLevel;
  window.__spmGoUniformUnit = goUniformUnit;
  window.__spmOnSearch = function(val) { searchQuery = val; render(); };
  window.__spmOpenModal = function () { editingResource = null; view.showModal = true; render(); };
  window.__spmCloseModal = function () { editingResource = null; view.showModal = false; render(); };
  window.__spmEdit = function (id) {
    editingResource = resources.find(r => String(r.id) === String(id)) || null;
    view.showModal = true;
    render();
  };
  window.__spmSaveModal = function () {
    const title = document.getElementById("f-title").value.trim();
    const link = document.getElementById("f-link").value.trim();
    const author = document.getElementById("f-author").value.trim();
    const year = document.getElementById("f-year").value.trim();
    if (!title || !link) { showSiscAlert("Sila masukkan tajuk dan pautan Google Drive."); return; }
    saveResource({ title, link, author, year });
    view.showModal = false;
  };

  render();
})();





