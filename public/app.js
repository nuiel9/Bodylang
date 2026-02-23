document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const uploadSection = document.getElementById("uploadSection");
  const loadingSection = document.getElementById("loadingSection");
  const resultsSection = document.getElementById("resultsSection");
  const errorSection = document.getElementById("errorSection");

  const uploadArea = document.getElementById("uploadArea");
  const fileInput = document.getElementById("fileInput");
  const uploadPlaceholder = document.getElementById("uploadPlaceholder");
  const previewContainer = document.getElementById("previewContainer");
  const previewImage = document.getElementById("previewImage");
  const removeBtn = document.getElementById("removeBtn");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const tryAgainBtn = document.getElementById("tryAgainBtn");
  const retryBtn = document.getElementById("retryBtn");

  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");
  const chatMessages = document.getElementById("chatMessages");
  const recommendBtn = document.getElementById("recommendBtn");
  const recommendCard = document.getElementById("recommendCard");
  const recommendContent = document.getElementById("recommendContent");

  const historyToggleBtn = document.getElementById("historyToggleBtn");
  const historyPanel = document.getElementById("historyPanel");
  const historyOverlay = document.getElementById("historyOverlay");
  const historyCloseBtn = document.getElementById("historyCloseBtn");
  const historyClearBtn = document.getElementById("historyClearBtn");
  const historyList = document.getElementById("historyList");
  const historyEmpty = document.getElementById("historyEmpty");
  const historyBadge = document.getElementById("historyBadge");

  const exportPdfBtn = document.getElementById("exportPdfBtn");

  let selectedFile = null;
  let analysisMode = "face"; // "face" or "palm"
  let lastAnalysisData = null;
  let lastAnalysisMode = "face";
  const HISTORY_KEY = "bodylang_history";
  const MAX_HISTORY = 20;

  // --- History Functions ---
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveHistory(entries) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch (e) {
      // localStorage full — remove oldest entry and retry
      if (entries.length > 1) {
        entries.pop();
        saveHistory(entries);
      }
    }
  }

  function createThumbnail(imgSrc, maxSize) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = () => resolve(null);
      img.src = imgSrc;
    });
  }

  async function addHistoryEntry(data, imageSrc, mode) {
    const entries = getHistory();
    const thumbnail = await createThumbnail(imageSrc, 120);
    const resultImage = await createThumbnail(imageSrc, 480);
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      mode: mode || "face",
      name: document.getElementById("nameInput").value.trim() || null,
      birthday: document.getElementById("birthdayInput").value || null,
      personalityType: data.personalityPrediction?.overallType || "",
      element: data.personalityPrediction?.element || "",
      thumbnail,
      resultImage,
      data,
    };
    entries.unshift(entry);
    if (entries.length > MAX_HISTORY) entries.length = MAX_HISTORY;
    saveHistory(entries);
    updateHistoryBadge();
    return entry;
  }

  function deleteHistoryEntry(id) {
    const entries = getHistory().filter((e) => e.id !== id);
    saveHistory(entries);
    updateHistoryBadge();
    renderHistoryList();
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    updateHistoryBadge();
    renderHistoryList();
  }

  function updateHistoryBadge() {
    const count = getHistory().length;
    historyBadge.textContent = count;
    historyBadge.hidden = count === 0;
  }

  function formatDate(isoStr) {
    const d = new Date(isoStr);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear() + 543; // Buddhist Era
    const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    return `${day}/${month}/${year} ${time}`;
  }

  function renderHistoryList() {
    const entries = getHistory();
    // Clear existing items but keep the empty state element
    const items = historyList.querySelectorAll(".history-item");
    items.forEach((item) => item.remove());

    historyEmpty.hidden = entries.length > 0;

    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <img class="history-thumb" src="${entry.thumbnail || ""}" alt="" />
        <div class="history-item-info">
          <div class="history-item-type">${entry.personalityType || "ไม่ระบุ"}</div>
          <div class="history-item-meta">
            <span class="history-mode-tag ${entry.mode === "palm" ? "mode-palm" : "mode-face"}">${entry.mode === "palm" ? "ลายมือ" : "โหงวเฮ้ง"}</span>
            ${entry.element ? '<span class="history-element">' + entry.element + "</span>" : ""}
            ${entry.name ? '<span class="history-name">' + entry.name + "</span>" : ""}
          </div>
          <div class="history-item-date">${formatDate(entry.timestamp)}</div>
        </div>
        <button class="history-delete-btn" data-id="${entry.id}" title="ลบ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      `;
      // Click on item to view
      item.addEventListener("click", (e) => {
        if (e.target.closest(".history-delete-btn")) return;
        viewHistoryEntry(entry);
      });
      // Delete button
      item.querySelector(".history-delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteHistoryEntry(entry.id);
      });
      historyList.appendChild(item);
    });
  }

  function viewHistoryEntry(entry) {
    closeHistoryPanel();
    // Set the result image from stored data
    document.getElementById("resultImage").src = entry.resultImage || entry.thumbnail || "";
    renderResults(entry.data, true, entry.mode || "face");
    showSection(resultsSection);
  }

  function openHistoryPanel() {
    renderHistoryList();
    historyPanel.classList.add("open");
    historyOverlay.hidden = false;
  }

  function closeHistoryPanel() {
    historyPanel.classList.remove("open");
    historyOverlay.hidden = true;
  }

  // History event listeners
  historyToggleBtn.addEventListener("click", () => {
    if (historyPanel.classList.contains("open")) {
      closeHistoryPanel();
    } else {
      openHistoryPanel();
    }
  });
  historyCloseBtn.addEventListener("click", closeHistoryPanel);
  historyOverlay.addEventListener("click", closeHistoryPanel);
  historyClearBtn.addEventListener("click", () => {
    if (getHistory().length === 0) return;
    if (confirm("ลบประวัติการวิเคราะห์ทั้งหมด?")) {
      clearHistory();
    }
  });

  // Initialize badge on load
  updateHistoryBadge();

  // --- Mode Selector ---
  const modeBtns = document.querySelectorAll(".mode-btn");
  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      analysisMode = btn.dataset.mode;
      const title = document.getElementById("uploadTitle");
      const desc = document.getElementById("uploadDescription");
      const nameGroup = document.getElementById("nameInput").closest(".birthday-input-group");
      const birthdayGroup = document.getElementById("birthdayInput").closest(".birthday-input-group");
      if (analysisMode === "palm") {
        title.textContent = "วิเคราะห์ลายมือและหัตถศาสตร์";
        desc.textContent = "อัปโหลดรูปฝ่ามือ แล้ว AI จะอ่านเส้นลายมือ เนินมือ ลักษณะนิ้ว ทำนายนิสัย บุคลิกภาพ โชคชะตา";
        analyzeBtn.querySelector(".btn-text").textContent = "วิเคราะห์ลายมือ & หัตถศาสตร์";
        nameGroup.hidden = true;
        birthdayGroup.hidden = true;
      } else {
        title.textContent = "วิเคราะห์บุคลิกภาพจากภาษากายและโหงวเฮ้ง";
        desc.textContent = "อัปโหลดรูปภาพ แล้ว AI จะวิเคราะห์ภาษากายและโหงวเฮ้ง ทำนายนิสัย บุคลิกภาพ พร้อมคำแนะนำ";
        analyzeBtn.querySelector(".btn-text").textContent = "วิเคราะห์ภาษากาย & โหงวเฮ้ง & เลขศาสตร์";
        nameGroup.hidden = false;
        birthdayGroup.hidden = false;
      }
    });
  });

  // --- Upload Area Events ---
  uploadArea.addEventListener("click", (e) => {
    if (e.target === removeBtn || removeBtn.contains(e.target)) return;
    fileInput.click();
  });

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearFile();
  });

  analyzeBtn.addEventListener("click", () => analyzeImage());
  tryAgainBtn.addEventListener("click", () => resetToUpload());
  retryBtn.addEventListener("click", () => resetToUpload());

  // Chat events
  chatSendBtn.addEventListener("click", () => sendChat());
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat();
  });

  // Recommendation event
  recommendBtn.addEventListener("click", () => getRecommendations());

  // --- File Handling ---
  function handleFile(file) {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, GIF, WebP) เท่านั้น");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ขนาดไม่เกิน 10MB");
      return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      uploadPlaceholder.hidden = true;
      previewContainer.hidden = false;
      analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  function clearFile() {
    selectedFile = null;
    fileInput.value = "";
    previewImage.src = "";
    uploadPlaceholder.hidden = false;
    previewContainer.hidden = true;
    analyzeBtn.disabled = true;
  }

  // --- Show/Hide Sections ---
  function showSection(section) {
    uploadSection.hidden = true;
    loadingSection.hidden = true;
    resultsSection.hidden = true;
    errorSection.hidden = true;
    section.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetToUpload() {
    clearFile();
    chatMessages.innerHTML = "";
    recommendCard.hidden = true;
    recommendBtn.disabled = false;
    showSection(uploadSection);
  }

  // --- Loading Animation ---
  function animateLoadingSteps() {
    const steps = document.querySelectorAll(".loading-steps .step");
    let current = 0;

    const interval = setInterval(() => {
      if (current > 0) {
        steps[current - 1].classList.remove("active");
        steps[current - 1].classList.add("done");
      }
      if (current < steps.length) {
        steps[current].classList.add("active");
        current++;
      } else {
        clearInterval(interval);
      }
    }, 1500);

    return interval;
  }

  // --- Analyze Image ---
  function updateLoadingSteps(mode) {
    const loadingText = document.getElementById("loadingText");
    const loadingSteps = document.getElementById("loadingSteps");
    if (mode === "palm") {
      loadingText.textContent = "AI กำลังอ่านลายมือและวิเคราะห์หัตถศาสตร์ของคุณ";
      loadingSteps.innerHTML = `
        <div class="step active"><div class="step-dot"></div><span>อ่านเส้นลายมือ</span></div>
        <div class="step"><div class="step-dot"></div><span>วิเคราะห์เนินมือ</span></div>
        <div class="step"><div class="step-dot"></div><span>ทำนายบุคลิก</span></div>
        <div class="step"><div class="step-dot"></div><span>สร้างคำแนะนำ</span></div>
      `;
    } else {
      loadingText.textContent = "AI กำลังอ่านภาษากายและโหงวเฮ้งของคุณ";
      loadingSteps.innerHTML = `
        <div class="step active"><div class="step-dot"></div><span>วิเคราะห์ท่าทาง</span></div>
        <div class="step"><div class="step-dot"></div><span>อ่านโหงวเฮ้ง</span></div>
        <div class="step"><div class="step-dot"></div><span>ทำนายบุคลิก</span></div>
        <div class="step"><div class="step-dot"></div><span>สร้างคำแนะนำ</span></div>
      `;
    }
  }

  async function analyzeImage() {
    if (!selectedFile) return;

    updateLoadingSteps(analysisMode);
    showSection(loadingSection);

    document.querySelectorAll(".loading-steps .step").forEach((s) => {
      s.classList.remove("active", "done");
    });
    const stepInterval = animateLoadingSteps();

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      let endpoint = "/api/analyze";
      if (analysisMode === "palm") {
        endpoint = "/api/analyze-palm";
      } else {
        const birthdayVal = document.getElementById("birthdayInput").value;
        if (birthdayVal) formData.append("birthday", birthdayVal);
        const nameVal = document.getElementById("nameInput").value.trim();
        if (nameVal) formData.append("name", nameVal);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "การวิเคราะห์ล้มเหลว");
      }

      const result = await response.json();

      if (result.success) {
        renderResults(result.data, false, analysisMode);
        showSection(resultsSection);
        // Save to history
        addHistoryEntry(result.data, previewImage.src, analysisMode);
      } else {
        throw new Error(result.error || "ไม่สามารถวิเคราะห์ได้");
      }
    } catch (error) {
      clearInterval(stepInterval);
      document.getElementById("errorMessage").textContent =
        error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่";
      showSection(errorSection);
    }
  }

  // --- Send Chat ---
  async function sendChat() {
    const question = chatInput.value.trim();
    if (!question) return;

    // Add user message
    addChatMsg(question, "user");
    chatInput.value = "";

    // Add loading message
    const loadingMsg = addChatMsg("กำลังคิด...", "ai loading");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      loadingMsg.remove();

      if (data.success) {
        addChatMsg(data.answer, "ai");
      } else {
        addChatMsg(data.error || "เกิดข้อผิดพลาด", "ai");
      }
    } catch {
      loadingMsg.remove();
      addChatMsg("เกิดข้อผิดพลาด กรุณาลองใหม่", "ai");
    }
  }

  function formatMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  function addChatMsg(text, className) {
    const msg = document.createElement("div");
    msg.className = `chat-msg ${className}`;
    if (className.includes("ai") && !className.includes("loading")) {
      msg.innerHTML = formatMarkdown(text);
    } else {
      msg.textContent = text;
    }
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg;
  }

  // --- Get Recommendations ---
  async function getRecommendations() {
    recommendBtn.disabled = true;
    recommendBtn.querySelector(".btn-text").textContent = "กำลังโหลด...";

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        renderRecommendations(data.data);
        recommendCard.hidden = false;
        recommendCard.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
        recommendBtn.disabled = false;
      }
    } catch {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
      recommendBtn.disabled = false;
    }

    recommendBtn.querySelector(".btn-text").textContent =
      "ดูคำแนะนำเพิ่มเติม (โชคลาภ, สีมงคล, ความรัก...)";
  }

  function renderRecommendations(data) {
    recommendContent.innerHTML = "";
    const recs = data.recommendations || [];
    recs.forEach((rec) => {
      const item = document.createElement("div");
      item.className = "recommend-item";
      item.innerHTML = `
        <div class="recommend-item-category">${rec.category || ""}</div>
        <div class="recommend-item-title">${rec.title || ""}</div>
        <div class="recommend-item-detail">${rec.detail || ""}</div>
      `;
      recommendContent.appendChild(item);
    });
  }

  // --- Render Results ---
  function renderResults(data, isFromHistory, mode) {
    mode = mode || "face";

    // Store for PDF export
    lastAnalysisData = data;
    lastAnalysisMode = mode;

    // Show uploaded image (for fresh analysis; history sets it before calling)
    if (!isFromHistory) {
      document.getElementById("resultImage").src = previewImage.src;
    }

    // Toggle face-mode vs palm-mode cards
    document.querySelectorAll(".face-mode-card").forEach((el) => { el.hidden = mode === "palm"; });
    document.querySelectorAll(".palm-mode-card").forEach((el) => { el.hidden = mode !== "palm"; });

    // Personality type & summary
    document.getElementById("personalityType").textContent =
      data.personalityPrediction?.overallType || "ไม่ระบุ";
    document.getElementById("overallSummary").textContent =
      data.overallSummary || "";

    // Traits + element
    const traitsContainer = document.getElementById("traitsContainer");
    traitsContainer.innerHTML = "";
    if (data.personalityPrediction?.element) {
      const elemTag = document.createElement("span");
      elemTag.className = "trait-tag";
      elemTag.style.background = "rgba(251, 191, 36, 0.15)";
      elemTag.style.borderColor = "rgba(251, 191, 36, 0.3)";
      elemTag.style.color = "#fbbf24";
      elemTag.textContent = "ธาตุ: " + data.personalityPrediction.element;
      traitsContainer.appendChild(elemTag);
    }
    (data.personalityPrediction?.traits || []).forEach((trait) => {
      const tag = document.createElement("span");
      tag.className = "trait-tag";
      tag.textContent = trait;
      traitsContainer.appendChild(tag);
    });

    // Body Language Analysis
    const analysisGrid = document.getElementById("analysisGrid");
    analysisGrid.innerHTML = "";

    const analysis = data.bodyLanguageAnalysis || {};

    // Body language overall type
    const blType = analysis.overallType;
    if (blType) {
      const typeTag = document.createElement("div");
      typeTag.className = "analysis-item";
      typeTag.style.gridColumn = "1 / -1";
      typeTag.style.textAlign = "center";
      typeTag.style.borderColor = "rgba(124, 92, 252, 0.3)";
      typeTag.innerHTML = `<div class="analysis-label" style="justify-content:center">ประเภทภาษากาย</div><div class="analysis-observation">${blType}</div>`;
      analysisGrid.appendChild(typeTag);
    }

    const analysisMap = {
      posture: "ท่าทาง (Posture)",
      facialExpression: "สีหน้า (Expression)",
      armsAndHands: "แขนและมือ (Arms & Hands)",
      eyeDirection: "สายตา (Eye Direction)",
    };
    for (const [key, label] of Object.entries(analysisMap)) {
      if (analysis[key]) {
        const item = document.createElement("div");
        item.className = "analysis-item";
        item.innerHTML = `
          <div class="analysis-label">${label}</div>
          <div class="analysis-observation">${analysis[key].observation || ""}</div>
          <div class="analysis-meaning">${analysis[key].meaning || ""}</div>
        `;
        analysisGrid.appendChild(item);
      }
    }

    // Face Reading (โหงวเฮ้ง)
    const faceGrid = document.getElementById("faceReadingGrid");
    faceGrid.innerHTML = "";

    const faceMap = {
      faceShape: "รูปหน้า (ธาตุ)",
      forehead: "หน้าผาก (天庭)",
      eyebrows: "คิ้ว (保壽官)",
      eyes: "ตา (監察官)",
      nose: "จมูก (審辨官)",
      mouth: "ปาก (出納官)",
      ears: "หู (採聽官)",
      cheekbones: "โหนกแก้ม (權骨)",
      chin: "คาง (地閣)",
    };

    const faceReading = data.faceReading || {};
    const ratingConfig = {
      good: { label: "ดี", icon: "&#9650;", className: "rating-good" },
      neutral: { label: "ปานกลาง", icon: "&#9644;", className: "rating-neutral" },
      bad: { label: "ควรระวัง", icon: "&#9660;", className: "rating-bad" },
    };
    for (const [key, label] of Object.entries(faceMap)) {
      if (faceReading[key]) {
        const rating = faceReading[key].rating || "neutral";
        const rc = ratingConfig[rating] || ratingConfig.neutral;
        const item = document.createElement("div");
        item.className = `analysis-item face-${rating}`;
        item.innerHTML = `
          <div class="analysis-label">${label}<span class="face-rating ${rc.className}">${rc.icon} ${rc.label}</span></div>
          <div class="analysis-observation">${faceReading[key].feature || ""}</div>
          <div class="analysis-meaning">${faceReading[key].meaning || ""}</div>
        `;
        faceGrid.appendChild(item);
      }
    }

    // Strengths
    const strengthsList = document.getElementById("strengthsList");
    strengthsList.innerHTML = "";
    (data.strengths || []).forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      strengthsList.appendChild(li);
    });

    // Areas to improve
    const improveList = document.getElementById("improveList");
    improveList.innerHTML = "";
    (data.areasToImprove || []).forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      improveList.appendChild(li);
    });

    // Advice
    const adviceGrid = document.getElementById("adviceGrid");
    adviceGrid.innerHTML = "";

    const adviceConfig = [
      { key: "career", label: "การงาน", icon: "&#128188;", className: "career" },
      { key: "relationships", label: "ความสัมพันธ์", icon: "&#128149;", className: "relationships" },
      { key: "wealth", label: "การเงิน/โชคลาภ", icon: "&#128176;", className: "mental-health" },
      { key: "selfDevelopment", label: "พัฒนาตัวเอง", icon: "&#127793;", className: "self-development" },
    ];

    const advice = data.advice || {};
    adviceConfig.forEach(({ key, label, icon, className }) => {
      if (advice[key]) {
        const item = document.createElement("div");
        item.className = `advice-item ${className}`;
        item.innerHTML = `
          <div class="advice-category">
            <span class="advice-category-icon">${icon}</span>
            ${label}
          </div>
          <div class="advice-text">${advice[key]}</div>
        `;
        adviceGrid.appendChild(item);
      }
    });

    // Three Zones (三停)
    const zonesContainer = document.getElementById("threeZonesContent");
    if (zonesContainer) {
      zonesContainer.innerHTML = "";
      const zones = data.threeZones;
      if (zones) {
        const zoneConfig = [
          { key: "upper", label: "ช่วงบน (天停) อายุ 1-30", icon: "&#9650;" },
          { key: "middle", label: "ช่วงกลาง (人停) อายุ 31-50", icon: "&#9670;" },
          { key: "lower", label: "ช่วงล่าง (地停) อายุ 51+", icon: "&#9660;" },
        ];
        zoneConfig.forEach(({ key, label, icon }) => {
          if (zones[key]) {
            const item = document.createElement("div");
            item.className = "zone-item";
            item.innerHTML = `<div class="zone-label">${icon} ${label}</div><div class="zone-text">${zones[key]}</div>`;
            zonesContainer.appendChild(item);
          }
        });
      }
    }

    // Fortune Telling
    const fortuneContainer = document.getElementById("fortuneContent");
    if (fortuneContainer) {
      fortuneContainer.innerHTML = "";
      const fortune = data.fortuneTelling;
      if (fortune) {
        const items = [
          { label: "สีมงคล", value: fortune.luckyColor, icon: "&#127912;" },
          { label: "เลขมงคล", value: fortune.luckyNumber, icon: "&#128290;" },
          { label: "สิ่งที่ควรระวัง", value: fortune.caution, icon: "&#9888;&#65039;" },
        ];
        items.forEach(({ label, value, icon }) => {
          if (value) {
            const item = document.createElement("div");
            item.className = "fortune-item";
            item.innerHTML = `<span class="fortune-icon">${icon}</span><strong>${label}:</strong> ${value}`;
            fortuneContainer.appendChild(item);
          }
        });
      }
    }

    // Numerology (เลขศาสตร์) — only for face mode
    const numerologyCard = document.getElementById("numerologyCard");
    const numerologyContent = document.getElementById("numerologyContent");
    if (numerologyContent) {
      numerologyContent.innerHTML = "";
      const num = mode === "face" ? data.numerology : null;
      if (num) {
        numerologyCard.hidden = false;

        // Life Path Number (big display)
        if (num.lifePathNumber && num.lifePathNumber !== "null" && num.lifePathNumber !== null) {
          const lpDiv = document.createElement("div");
          lpDiv.className = "numerology-lifepath";
          let planetInfo = "";
          if (num.planetCheiro || num.planetThai) {
            planetInfo = `<div class="lifepath-planets">`;
            if (num.planetCheiro) planetInfo += `<span class="planet-tag cheiro">Cheiro: ${num.planetCheiro}</span>`;
            if (num.planetThai) planetInfo += `<span class="planet-tag thai">ไทย: ${num.planetThai}</span>`;
            planetInfo += `</div>`;
          }
          lpDiv.innerHTML = `
            <div class="lifepath-number">${num.lifePathNumber}</div>
            <div class="lifepath-label">เลขประจำตัว (Life Path Number)</div>
            ${planetInfo}
            <div class="lifepath-meaning">${num.lifePathMeaning || ""}</div>
          `;
          numerologyContent.appendChild(lpDiv);
        }

        // Name Number (Cheiro's Chaldean)
        const nn = num.nameNumber;
        if (nn && nn !== "null" && nn !== null) {
          const nnDiv = document.createElement("div");
          nnDiv.className = "name-number-section";
          let nnHTML = `<div class="name-number-header"><span class="nn-icon">&#9997;</span> เลขศาสตร์ชื่อ (Name Number)</div>`;
          if (nn.name) {
            nnHTML += `<div class="nn-name">"${nn.name}"</div>`;
          }
          nnHTML += `<div class="nn-numbers">`;
          if (nn.compoundNumber) {
            nnHTML += `<div class="nn-compound"><span class="nn-num">${nn.compoundNumber}</span><span class="nn-label">Compound</span></div>`;
          }
          if (nn.singleNumber) {
            nnHTML += `<div class="nn-single"><span class="nn-num">${nn.singleNumber}</span><span class="nn-label">Name Number</span></div>`;
          }
          nnHTML += `</div>`;
          if (nn.compoundMeaning) {
            nnHTML += `<div class="nn-meaning">${nn.compoundMeaning}</div>`;
          }
          if (nn.planetName) {
            nnHTML += `<div class="nn-planet"><span class="planet-tag cheiro">Cheiro: ${nn.planetName}</span></div>`;
          }
          if (nn.thaiNameNumber) {
            nnHTML += `<div class="nn-thai"><span class="num-icon">&#127481;</span> เลขชื่อไทย: <strong>${nn.thaiCompound || ""}</strong> → <strong>${nn.thaiNameNumber}</strong></div>`;
          }
          if (nn.harmony) {
            const isGood = nn.harmony.includes("ส่งเสริม") || nn.harmony.includes("มิตร") || nn.harmony.includes("สอดคล้อง");
            nnHTML += `<div class="nn-harmony ${isGood ? "harmony-good" : "harmony-warn"}"><span class="num-icon">${isGood ? "&#9989;" : "&#9888;"}</span> ${nn.harmony}</div>`;
          }
          if (nn.suggestion) {
            nnHTML += `<div class="nn-suggestion"><span class="num-icon">&#128161;</span> ${nn.suggestion}</div>`;
          }
          nnDiv.innerHTML = nnHTML;
          numerologyContent.appendChild(nnDiv);
        }

        // Friendly numbers (Cheiro)
        if (num.friendlyNumbers) {
          const fnDiv = document.createElement("div");
          fnDiv.className = "numerology-item";
          fnDiv.innerHTML = `<span class="num-icon">&#129309;</span><strong>เลขคู่มิตร (Cheiro):</strong> ${num.friendlyNumbers}`;
          numerologyContent.appendChild(fnDiv);
        }

        // Enemy numbers
        if (num.enemyNumbers) {
          const enDiv = document.createElement("div");
          enDiv.className = "numerology-item";
          enDiv.innerHTML = `<span class="num-icon">&#9876;</span><strong>เลขขัดแย้ง:</strong> ${num.enemyNumbers}`;
          numerologyContent.appendChild(enDiv);
        }

        // Element match
        if (num.elementMatch) {
          const emDiv = document.createElement("div");
          emDiv.className = "numerology-item";
          emDiv.innerHTML = `<span class="num-icon">&#9775;</span><strong>ธาตุเลขศาสตร์ vs โหงวเฮ้ง:</strong> ${num.elementMatch}`;
          numerologyContent.appendChild(emDiv);
        }

        // Lucky numbers
        if (num.luckyNumbers && num.luckyNumbers.length) {
          const lnDiv = document.createElement("div");
          lnDiv.className = "numerology-item";
          lnDiv.innerHTML = `<span class="num-icon">&#127808;</span><strong>เลขมงคล:</strong> <span class="num-tags">${num.luckyNumbers.map(n => '<span class="num-tag good">' + n + '</span>').join(" ")}</span>`;
          numerologyContent.appendChild(lnDiv);
        }

        // Unlucky numbers
        if (num.unluckyNumbers && num.unluckyNumbers.length) {
          const unDiv = document.createElement("div");
          unDiv.className = "numerology-item";
          unDiv.innerHTML = `<span class="num-icon">&#9888;</span><strong>เลขควรหลีกเลี่ยง:</strong> <span class="num-tags">${num.unluckyNumbers.map(n => '<span class="num-tag bad">' + n + '</span>').join(" ")}</span>`;
          numerologyContent.appendChild(unDiv);
        }

        // Lucky colors
        if (num.luckyColors && num.luckyColors.length) {
          const lcDiv = document.createElement("div");
          lcDiv.className = "numerology-item";
          lcDiv.innerHTML = `<span class="num-icon">&#127912;</span><strong>สีมงคล:</strong> ${num.luckyColors.join(", ")}`;
          numerologyContent.appendChild(lcDiv);
        }

        // Advice
        if (num.advice) {
          const adDiv = document.createElement("div");
          adDiv.className = "numerology-item numerology-advice";
          adDiv.innerHTML = `<span class="num-icon">&#128161;</span><strong>คำแนะนำ:</strong> ${num.advice}`;
          numerologyContent.appendChild(adDiv);
        }
      } else {
        numerologyCard.hidden = true;
      }
    }

    // --- Palm Reading Results ---
    if (mode === "palm") {
      renderPalmResults(data);
    }

    // Reset chat and recommendations
    chatMessages.innerHTML = "";
    recommendCard.hidden = true;
    recommendBtn.disabled = false;

    // Disable chat/recommendations when viewing from history (no server session)
    const chatCard = document.querySelector(".chat-card");
    if (isFromHistory) {
      recommendBtn.disabled = true;
      recommendBtn.querySelector(".btn-text").textContent = "คำแนะนำไม่พร้อมใช้งาน (ดูจากประวัติ)";
      if (chatCard) chatCard.hidden = true;
    } else {
      recommendBtn.querySelector(".btn-text").textContent = "ดูคำแนะนำเพิ่มเติม (โชคลาภ, สีมงคล, ความรัก...)";
      if (chatCard) chatCard.hidden = false;
    }
  }

  // --- Palm Results Rendering ---
  function renderPalmResults(data) {
    const ratingConfig = {
      good: { label: "ดี", icon: "&#9650;", className: "rating-good" },
      neutral: { label: "ปานกลาง", icon: "&#9644;", className: "rating-neutral" },
      bad: { label: "ควรระวัง", icon: "&#9660;", className: "rating-bad" },
    };

    // Palm Overview
    const overviewEl = document.getElementById("palmOverviewContent");
    if (overviewEl) {
      overviewEl.innerHTML = "";
      const po = data.palmOverview;
      if (po) {
        const items = [
          { label: "รูปทรงมือ", value: po.handType, icon: "&#9995;" },
          { label: "ธาตุหลัก", value: po.dominantElement, icon: "&#9775;" },
          { label: "ลักษณะผิว", value: po.skinTexture, icon: "&#128400;" },
        ];
        items.forEach(({ label, value, icon }) => {
          if (value) {
            const item = document.createElement("div");
            item.className = "fortune-item";
            item.innerHTML = `<span class="fortune-icon">${icon}</span><strong>${label}:</strong> ${value}`;
            overviewEl.appendChild(item);
          }
        });
        if (po.overallReading) {
          const summary = document.createElement("div");
          summary.className = "palm-overview-text";
          summary.textContent = po.overallReading;
          overviewEl.appendChild(summary);
        }
      }
    }

    // Major Lines
    const majorGrid = document.getElementById("majorLinesGrid");
    if (majorGrid) {
      majorGrid.innerHTML = "";
      const majorMap = {
        heartLine: "เส้นหัวใจ (Heart Line)",
        headLine: "เส้นสมอง (Head Line)",
        lifeLine: "เส้นชีวิต (Life Line)",
        fateLine: "เส้นโชคชะตา (Fate Line)",
      };
      const majorLines = data.majorLines || {};
      for (const [key, label] of Object.entries(majorMap)) {
        if (majorLines[key]) {
          const rating = majorLines[key].rating || "neutral";
          const rc = ratingConfig[rating] || ratingConfig.neutral;
          const item = document.createElement("div");
          item.className = `analysis-item face-${rating}`;
          item.innerHTML = `
            <div class="analysis-label">${label}<span class="face-rating ${rc.className}">${rc.icon} ${rc.label}</span></div>
            <div class="analysis-observation">${majorLines[key].feature || ""}</div>
            <div class="analysis-meaning">${majorLines[key].meaning || ""}</div>
          `;
          majorGrid.appendChild(item);
        }
      }
    }

    // Minor Lines
    const minorGrid = document.getElementById("minorLinesGrid");
    if (minorGrid) {
      minorGrid.innerHTML = "";
      const minorMap = {
        sunLine: "เส้นดวงอาทิตย์ (Sun Line)",
        mercuryLine: "เส้นพุธ (Mercury Line)",
        marriageLine: "เส้นแต่งงาน (Marriage Line)",
        braceletLines: "เส้นข้อมือ (Bracelet Lines)",
      };
      const minorLines = data.minorLines || {};
      for (const [key, label] of Object.entries(minorMap)) {
        if (minorLines[key]) {
          const item = document.createElement("div");
          item.className = "analysis-item";
          item.innerHTML = `
            <div class="analysis-label">${label}</div>
            <div class="analysis-observation">${minorLines[key].feature || ""}</div>
            <div class="analysis-meaning">${minorLines[key].meaning || ""}</div>
          `;
          minorGrid.appendChild(item);
        }
      }
    }

    // Mounts
    const mountsGrid = document.getElementById("mountsGrid");
    if (mountsGrid) {
      mountsGrid.innerHTML = "";
      const mountMap = {
        jupiter: "เนินพฤหัสบดี (Jupiter)",
        saturn: "เนินเสาร์ (Saturn)",
        apollo: "เนินอพอลโล (Apollo)",
        mercury: "เนินพุธ (Mercury)",
        venus: "เนินศุกร์ (Venus)",
        luna: "เนินจันทร์ (Luna)",
        mars: "เนินอังคาร (Mars)",
      };
      const mounts = data.mounts || {};
      for (const [key, label] of Object.entries(mountMap)) {
        if (mounts[key]) {
          const item = document.createElement("div");
          item.className = "analysis-item";
          item.innerHTML = `
            <div class="analysis-label">${label}</div>
            <div class="analysis-observation">${mounts[key].feature || ""}</div>
            <div class="analysis-meaning">${mounts[key].meaning || ""}</div>
          `;
          mountsGrid.appendChild(item);
        }
      }
    }

    // Fingers
    const fingersGrid = document.getElementById("fingersGrid");
    if (fingersGrid) {
      fingersGrid.innerHTML = "";
      const fingerMap = {
        thumb: "หัวแม่มือ (Thumb)",
        index: "นิ้วชี้ (Jupiter)",
        middle: "นิ้วกลาง (Saturn)",
        ring: "นิ้วนาง (Apollo)",
        pinky: "นิ้วก้อย (Mercury)",
      };
      const fingers = data.fingers || {};
      for (const [key, label] of Object.entries(fingerMap)) {
        if (fingers[key]) {
          const item = document.createElement("div");
          item.className = "analysis-item";
          item.innerHTML = `
            <div class="analysis-label">${label}</div>
            <div class="analysis-observation">${fingers[key].feature || ""}</div>
            <div class="analysis-meaning">${fingers[key].meaning || ""}</div>
          `;
          fingersGrid.appendChild(item);
        }
      }
    }
  }

  // --- PDF Export ---
  exportPdfBtn.addEventListener("click", () => generatePDF());

  async function generatePDF() {
    if (!lastAnalysisData) return;

    exportPdfBtn.disabled = true;
    exportPdfBtn.querySelector(".btn-text").textContent = "กำลังสร้าง PDF...";

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentW = pageW - margin * 2;
      let y = margin;

      // Register Thai font from embedded NotoSansThai
      // jsPDF doesn't have Thai built-in, so we use a Unicode-safe approach
      // We'll use the default font with careful encoding
      doc.setFont("Helvetica");

      // --- Helper Functions ---
      function checkPage(needed) {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
          return true;
        }
        return false;
      }

      function drawSectionHeader(title) {
        checkPage(14);
        doc.setFillColor(124, 92, 252);
        doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.text(title, margin + 4, y + 7);
        doc.setTextColor(40, 40, 60);
        y += 14;
      }

      function drawSubHeader(title) {
        checkPage(10);
        doc.setFontSize(11);
        doc.setTextColor(124, 92, 252);
        doc.text(title, margin, y + 4);
        doc.setDrawColor(124, 92, 252);
        doc.setLineWidth(0.3);
        doc.line(margin, y + 6, margin + contentW, y + 6);
        doc.setTextColor(40, 40, 60);
        y += 10;
      }

      function drawKeyValue(key, value) {
        if (!value) return;
        checkPage(8);
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 140);
        doc.text(key + ":", margin + 2, y + 4);
        doc.setTextColor(40, 40, 60);
        const keyW = doc.getTextWidth(key + ": ");
        const lines = doc.splitTextToSize(String(value), contentW - keyW - 4);
        doc.text(lines, margin + 2 + keyW, y + 4);
        y += lines.length * 5 + 2;
      }

      function drawParagraph(text, fontSize) {
        if (!text) return;
        doc.setFontSize(fontSize || 9);
        doc.setTextColor(60, 60, 80);
        const lines = doc.splitTextToSize(String(text), contentW - 4);
        checkPage(lines.length * 5 + 4);
        doc.text(lines, margin + 2, y + 4);
        y += lines.length * 5 + 4;
      }

      function drawBullet(text) {
        if (!text) return;
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 80);
        const lines = doc.splitTextToSize(String(text), contentW - 10);
        checkPage(lines.length * 5 + 2);
        doc.setFillColor(124, 92, 252);
        doc.circle(margin + 4, y + 3, 1.2, "F");
        doc.text(lines, margin + 8, y + 4);
        y += lines.length * 5 + 2;
      }

      function drawAnalysisItem(label, observation, meaning, rating) {
        checkPage(18);
        doc.setFontSize(9);
        doc.setTextColor(124, 92, 252);
        let labelText = label;
        if (rating) {
          const ratingMap = { good: " [Excellent]", neutral: " [Average]", bad: " [Caution]" };
          labelText += ratingMap[rating] || "";
        }
        doc.text(labelText, margin + 2, y + 4);
        y += 5;
        if (observation) {
          doc.setTextColor(40, 40, 60);
          const obsLines = doc.splitTextToSize(String(observation), contentW - 6);
          doc.text(obsLines, margin + 4, y + 4);
          y += obsLines.length * 5;
        }
        if (meaning) {
          doc.setTextColor(100, 100, 140);
          const meanLines = doc.splitTextToSize(String(meaning), contentW - 6);
          doc.text(meanLines, margin + 4, y + 4);
          y += meanLines.length * 5;
        }
        y += 3;
      }

      // --- Title / Header ---
      doc.setFillColor(10, 10, 26);
      doc.rect(0, 0, pageW, 35, "F");
      doc.setTextColor(155, 127, 255);
      doc.setFontSize(22);
      doc.text("BodyLang", margin, 15);
      doc.setFontSize(10);
      doc.setTextColor(180, 180, 210);
      const subtitle = lastAnalysisMode === "palm"
        ? "Palm Reading Analysis Report"
        : "Body Language & Face Reading Analysis Report";
      doc.text(subtitle, margin, 22);
      // Date
      const now = new Date();
      const dateStr = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 180);
      doc.text(dateStr, margin, 29);
      y = 42;

      // --- Image ---
      const resultImgSrc = document.getElementById("resultImage").src;
      if (resultImgSrc && resultImgSrc.startsWith("data:")) {
        try {
          const imgProps = doc.getImageProperties(resultImgSrc);
          const imgMaxW = Math.min(contentW * 0.5, 80);
          const ratio = imgProps.height / imgProps.width;
          const imgW = imgMaxW;
          const imgH = imgW * ratio;
          const imgX = (pageW - imgW) / 2;
          checkPage(imgH + 8);
          doc.addImage(resultImgSrc, "JPEG", imgX, y, imgW, Math.min(imgH, 80));
          y += Math.min(imgH, 80) + 8;
        } catch (e) {
          // Skip image if it fails
        }
      }

      // --- Personality Overview ---
      const data = lastAnalysisData;
      drawSectionHeader("Personality Overview");

      if (data.personalityPrediction?.overallType) {
        doc.setFontSize(14);
        doc.setTextColor(124, 92, 252);
        doc.text(data.personalityPrediction.overallType, margin + 2, y + 5);
        y += 10;
      }

      if (data.personalityPrediction?.element) {
        drawKeyValue("Element", data.personalityPrediction.element);
      }

      if (data.personalityPrediction?.traits?.length) {
        drawKeyValue("Traits", data.personalityPrediction.traits.join(", "));
      }

      if (data.overallSummary) {
        drawParagraph(data.overallSummary);
      }

      // --- Body Language (face mode) ---
      if (lastAnalysisMode === "face") {
        const analysis = data.bodyLanguageAnalysis || {};
        if (Object.keys(analysis).length > 0) {
          drawSectionHeader("Body Language Analysis");
          if (analysis.overallType) {
            drawKeyValue("Type", analysis.overallType);
          }
          const blMap = {
            posture: "Posture",
            facialExpression: "Facial Expression",
            armsAndHands: "Arms & Hands",
            eyeDirection: "Eye Direction",
          };
          for (const [key, label] of Object.entries(blMap)) {
            if (analysis[key]) {
              drawAnalysisItem(label, analysis[key].observation, analysis[key].meaning);
            }
          }
        }

        // --- Face Reading ---
        const faceReading = data.faceReading || {};
        if (Object.keys(faceReading).length > 0) {
          drawSectionHeader("Face Reading (Five Officers)");
          const faceMap = {
            faceShape: "Face Shape",
            forehead: "Forehead",
            eyebrows: "Eyebrows",
            eyes: "Eyes",
            nose: "Nose",
            mouth: "Mouth",
            ears: "Ears",
            cheekbones: "Cheekbones",
            chin: "Chin",
          };
          for (const [key, label] of Object.entries(faceMap)) {
            if (faceReading[key]) {
              drawAnalysisItem(label, faceReading[key].feature, faceReading[key].meaning, faceReading[key].rating);
            }
          }
        }

        // --- Three Zones ---
        const zones = data.threeZones;
        if (zones) {
          drawSectionHeader("Three Zones of Life");
          const zoneConfig = [
            { key: "upper", label: "Upper Zone (Age 1-30)" },
            { key: "middle", label: "Middle Zone (Age 31-50)" },
            { key: "lower", label: "Lower Zone (Age 51+)" },
          ];
          for (const { key, label } of zoneConfig) {
            if (zones[key]) {
              drawKeyValue(label, zones[key]);
            }
          }
        }
      }

      // --- Palm Reading (palm mode) ---
      if (lastAnalysisMode === "palm") {
        const po = data.palmOverview;
        if (po) {
          drawSectionHeader("Palm Overview");
          drawKeyValue("Hand Type", po.handType);
          drawKeyValue("Dominant Element", po.dominantElement);
          drawKeyValue("Skin Texture", po.skinTexture);
          if (po.overallReading) drawParagraph(po.overallReading);
        }

        const majorLines = data.majorLines || {};
        if (Object.keys(majorLines).length > 0) {
          drawSectionHeader("Major Lines");
          const majorMap = {
            heartLine: "Heart Line",
            headLine: "Head Line",
            lifeLine: "Life Line",
            fateLine: "Fate Line",
          };
          for (const [key, label] of Object.entries(majorMap)) {
            if (majorLines[key]) {
              drawAnalysisItem(label, majorLines[key].feature, majorLines[key].meaning, majorLines[key].rating);
            }
          }
        }

        const minorLines = data.minorLines || {};
        if (Object.keys(minorLines).length > 0) {
          drawSectionHeader("Minor Lines");
          const minorMap = {
            sunLine: "Sun Line",
            mercuryLine: "Mercury Line",
            marriageLine: "Marriage Line",
            braceletLines: "Bracelet Lines",
          };
          for (const [key, label] of Object.entries(minorMap)) {
            if (minorLines[key]) {
              drawAnalysisItem(label, minorLines[key].feature, minorLines[key].meaning);
            }
          }
        }

        const mounts = data.mounts || {};
        if (Object.keys(mounts).length > 0) {
          drawSectionHeader("Mounts");
          const mountMap = {
            jupiter: "Jupiter Mount",
            saturn: "Saturn Mount",
            apollo: "Apollo Mount",
            mercury: "Mercury Mount",
            venus: "Venus Mount",
            luna: "Luna Mount",
            mars: "Mars Mount",
          };
          for (const [key, label] of Object.entries(mountMap)) {
            if (mounts[key]) {
              drawAnalysisItem(label, mounts[key].feature, mounts[key].meaning);
            }
          }
        }

        const fingers = data.fingers || {};
        if (Object.keys(fingers).length > 0) {
          drawSectionHeader("Fingers");
          const fingerMap = {
            thumb: "Thumb",
            index: "Index (Jupiter)",
            middle: "Middle (Saturn)",
            ring: "Ring (Apollo)",
            pinky: "Pinky (Mercury)",
          };
          for (const [key, label] of Object.entries(fingerMap)) {
            if (fingers[key]) {
              drawAnalysisItem(label, fingers[key].feature, fingers[key].meaning);
            }
          }
        }
      }

      // --- Fortune ---
      const fortune = data.fortuneTelling;
      if (fortune) {
        drawSectionHeader("Fortune & Lucky Items");
        drawKeyValue("Lucky Color", fortune.luckyColor);
        drawKeyValue("Lucky Number", fortune.luckyNumber);
        drawKeyValue("Caution", fortune.caution);
      }

      // --- Numerology (face mode only) ---
      if (lastAnalysisMode === "face" && data.numerology) {
        const num = data.numerology;
        drawSectionHeader("Numerology");
        if (num.lifePathNumber) drawKeyValue("Life Path Number", num.lifePathNumber);
        if (num.planetCheiro) drawKeyValue("Planet (Cheiro)", num.planetCheiro);
        if (num.planetThai) drawKeyValue("Planet (Thai)", num.planetThai);
        if (num.lifePathMeaning) drawParagraph(num.lifePathMeaning);
        if (num.nameNumber && num.nameNumber.name) {
          drawSubHeader("Name Number: " + num.nameNumber.name);
          drawKeyValue("Compound", num.nameNumber.compoundNumber);
          drawKeyValue("Single", num.nameNumber.singleNumber);
          if (num.nameNumber.compoundMeaning) drawParagraph(num.nameNumber.compoundMeaning);
          if (num.nameNumber.harmony) drawKeyValue("Harmony", num.nameNumber.harmony);
          if (num.nameNumber.suggestion) drawKeyValue("Suggestion", num.nameNumber.suggestion);
        }
        if (num.friendlyNumbers) drawKeyValue("Friendly Numbers", num.friendlyNumbers);
        if (num.enemyNumbers) drawKeyValue("Enemy Numbers", num.enemyNumbers);
        if (num.luckyNumbers?.length) drawKeyValue("Lucky Numbers", num.luckyNumbers.join(", "));
        if (num.unluckyNumbers?.length) drawKeyValue("Unlucky Numbers", num.unluckyNumbers.join(", "));
        if (num.luckyColors?.length) drawKeyValue("Lucky Colors", num.luckyColors.join(", "));
        if (num.elementMatch) drawKeyValue("Element Match", num.elementMatch);
        if (num.advice) drawParagraph(num.advice);
      }

      // --- Strengths & Areas to Improve ---
      if (data.strengths?.length || data.areasToImprove?.length) {
        drawSectionHeader("Strengths & Areas to Improve");
        if (data.strengths?.length) {
          drawSubHeader("Strengths");
          data.strengths.forEach((s) => drawBullet(s));
        }
        if (data.areasToImprove?.length) {
          drawSubHeader("Areas to Improve");
          data.areasToImprove.forEach((s) => drawBullet(s));
        }
      }

      // --- Advice ---
      const advice = data.advice || {};
      if (Object.keys(advice).length > 0) {
        drawSectionHeader("Advice");
        const adviceMap = {
          career: "Career",
          relationships: "Relationships",
          wealth: "Wealth",
          selfDevelopment: "Self Development",
          health: "Health",
        };
        for (const [key, label] of Object.entries(adviceMap)) {
          if (advice[key]) {
            drawKeyValue(label, advice[key]);
          }
        }
      }

      // --- Footer on every page ---
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(10, 10, 26);
        doc.rect(0, pageH - 12, pageW, 12, "F");
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 140);
        doc.text("BodyLang - AI Body Language & Face Reading Analyzer | Powered by Gemini AI", margin, pageH - 5);
        doc.text(`Page ${i} / ${totalPages}`, pageW - margin - 20, pageH - 5);
      }

      // --- Save ---
      const modeLabel = lastAnalysisMode === "palm" ? "Palm" : "FaceReading";
      const ts = now.toISOString().slice(0, 10);
      doc.save(`BodyLang_${modeLabel}_${ts}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("PDF generation failed: " + err.message);
    }

    exportPdfBtn.disabled = false;
    exportPdfBtn.querySelector(".btn-text").textContent = "ดาวน์โหลดรายงาน PDF";
  }
});
