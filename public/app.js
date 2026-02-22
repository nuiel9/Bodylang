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

  // --- File Handling ---
  function handleFile(file) {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
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

    // Reset loading steps
    document.querySelectorAll(".loading-steps .step").forEach((s) => {
      s.classList.remove("active", "done");
    });
    const stepInterval = animateLoadingSteps();

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

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

  // --- Render Results ---
  function renderResults(data) {
    // Personality type & summary
    const personalityType = document.getElementById("personalityType");
    personalityType.textContent =
      data.personalityPrediction?.overallType || "ไม่ระบุ";

    const overallSummary = document.getElementById("overallSummary");
    overallSummary.textContent = data.overallSummary || "";

    // Traits
    const traitsContainer = document.getElementById("traitsContainer");
    traitsContainer.innerHTML = "";
    const traits = data.personalityPrediction?.traits || [];
    traits.forEach((trait) => {
      const tag = document.createElement("span");
      tag.className = "trait-tag";
      tag.textContent = trait;
      traitsContainer.appendChild(tag);
    });

    // Confidence if exists
    if (data.personalityPrediction?.confidence) {
      const confTag = document.createElement("span");
      confTag.className = "trait-tag";
      confTag.textContent =
        "ความมั่นใจ: " + data.personalityPrediction.confidence;
      traitsContainer.appendChild(confTag);
    }

    // Body Language Analysis
    const analysisGrid = document.getElementById("analysisGrid");
    analysisGrid.innerHTML = "";

    const analysisMap = {
      posture: "ท่าทางการยืน/นั่ง",
      facialExpression: "การแสดงออกทางสีหน้า",
      armsAndHands: "ท่าทางแขนและมือ",
      eyeDirection: "ทิศทางการมอง",
      spatialPositioning: "การจัดวางตัว",
      bodyTension: "ความตึงเครียดของร่างกาย",
    };

    const analysis = data.bodyLanguageAnalysis || {};
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
      {
        key: "career",
        label: "การงาน",
        icon: "&#128188;",
        className: "career",
      },
      {
        key: "relationships",
        label: "ความสัมพันธ์",
        icon: "&#128149;",
        className: "relationships",
      },
      {
        key: "mentalHealth",
        label: "สุขภาพจิต",
        icon: "&#129504;",
        className: "mental-health",
      },
      {
        key: "selfDevelopment",
        label: "พัฒนาตัวเอง",
        icon: "&#127793;",
        className: "self-development",
      },
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
  }
});
