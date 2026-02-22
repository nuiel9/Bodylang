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

  let selectedFile = null;

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
  async function analyzeImage() {
    if (!selectedFile) return;

    showSection(loadingSection);

    document.querySelectorAll(".loading-steps .step").forEach((s) => {
      s.classList.remove("active", "done");
    });
    const stepInterval = animateLoadingSteps();

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      const birthdayVal = document.getElementById("birthdayInput").value;
      if (birthdayVal) {
        formData.append("birthday", birthdayVal);
      }
      const nameVal = document.getElementById("nameInput").value.trim();
      if (nameVal) {
        formData.append("name", nameVal);
      }

      const response = await fetch("/api/analyze", {
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
        renderResults(result.data);
        showSection(resultsSection);
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
  function renderResults(data) {
    // Show uploaded image
    document.getElementById("resultImage").src = previewImage.src;

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

    // Numerology (เลขศาสตร์)
    const numerologyCard = document.getElementById("numerologyCard");
    const numerologyContent = document.getElementById("numerologyContent");
    if (numerologyContent) {
      numerologyContent.innerHTML = "";
      const num = data.numerology;
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

    // Reset chat and recommendations
    chatMessages.innerHTML = "";
    recommendCard.hidden = true;
    recommendBtn.disabled = false;
  }
});
