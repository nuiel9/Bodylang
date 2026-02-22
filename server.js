const express = require("express");
const multer = require("multer");
const Anthropic = require("@anthropic-ai/sdk").default;
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"));
    }
  },
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Initialize Anthropic client
const client = new Anthropic();

const SYSTEM_PROMPT = `คุณเป็นผู้เชี่ยวชาญด้านการอ่านภาษากาย (Body Language Expert) ระดับโลก ที่มีความรู้ลึกซึ้งในด้านจิตวิทยา การสื่อสารอวัจนภาษา และพฤติกรรมศาสตร์

เมื่อได้รับรูปภาพของบุคคล ให้วิเคราะห์ภาษากายอย่างละเอียดและตอบกลับเป็น JSON format เท่านั้น ตาม schema ด้านล่าง

สิ่งที่ต้องวิเคราะห์:
1. ท่าทางการยืน/นั่ง (Posture)
2. การแสดงออกทางสีหน้า (Facial Expression)
3. ตำแหน่งและท่าทางของแขน/มือ (Arms & Hands)
4. ทิศทางการมองของดวงตา (Eye Direction)
5. ระยะห่างและการจัดวางตัว (Spatial Positioning)
6. ความตึงเครียดของร่างกาย (Body Tension)

จากการวิเคราะห์เหล่านี้ ให้ทำนาย:
- บุคลิกภาพโดยรวม
- จุดเด่นของนิสัย
- จุดที่ควรพัฒนา
- คำแนะนำในด้านต่างๆ (การงาน, ความสัมพันธ์, สุขภาพจิต, การพัฒนาตัวเอง)

ตอบกลับเป็น JSON ตาม format นี้เท่านั้น:
{
  "bodyLanguageAnalysis": {
    "posture": { "observation": "...", "meaning": "..." },
    "facialExpression": { "observation": "...", "meaning": "..." },
    "armsAndHands": { "observation": "...", "meaning": "..." },
    "eyeDirection": { "observation": "...", "meaning": "..." },
    "spatialPositioning": { "observation": "...", "meaning": "..." },
    "bodyTension": { "observation": "...", "meaning": "..." }
  },
  "personalityPrediction": {
    "overallType": "...",
    "traits": ["...", "...", "..."],
    "confidence": "...",
    "detailedDescription": "..."
  },
  "strengths": ["...", "...", "..."],
  "areasToImprove": ["...", "...", "..."],
  "advice": {
    "career": "...",
    "relationships": "...",
    "mentalHealth": "...",
    "selfDevelopment": "..."
  },
  "overallSummary": "..."
}

หมายเหตุ: ทุกฟิลด์ต้องตอบเป็นภาษาไทย ยกเว้น key names ให้วิเคราะห์อย่างละเอียดและให้คำแนะนำที่เป็นประโยชน์`;

// API endpoint to analyze body language
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "กรุณาอัปโหลดรูปภาพ" });
  }

  try {
    const base64Image = req.file.buffer.toString("base64");
    const mediaType = req.file.mimetype;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: "วิเคราะห์ภาษากายของบุคคลในรูปภาพนี้ ทำนายนิสัยและบุคลิกภาพ พร้อมให้คำแนะนำในด้านต่างๆ",
            },
          ],
        },
      ],
    });

    const text = response.content[0].text;

    // Extract JSON from the response
    let result;
    try {
      // Try direct parse first
      result = JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try finding JSON object in the text
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          result = JSON.parse(text.substring(start, end + 1));
        } else {
          throw new Error("Could not parse response");
        }
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่อีกครั้ง",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Body Language Analyzer running at http://localhost:${PORT}`);
});
