/**
 * Discord Advanced Message Exporter with Auto-Scroll
 *
 * Script นี้จะ:
 * 1. Auto-scroll ขึ้นไปด้านบนเพื่อโหลดข้อความเก่าๆ
 * 2. รอให้โหลดเสร็จ
 * 3. ดึงข้อความทั้งหมด
 * 4. Export เป็นไฟล์
 *
 * วิธีใช้:
 * 1. เปิด Discord ใน Browser (Chrome/Firefox/Safari)
 * 2. เข้าห้อง #builder
 * 3. กด F12 หรือ Right-click → Inspect → Console
 * 4. Copy script นี้ทั้งหมดแล้ว Paste ใน Console
 * 5. กด Enter แล้วรอ (อาจใช้เวลา 2-5 นาที)
 */

console.log("🚀 Discord Advanced Message Exporter");
console.log("⏳ กำลังเริ่มการดึงข้อความ...");

// Configuration
const CONFIG = {
  SCROLL_INTERVAL: 1000,      // รอ 1 วินาทีระหว่างการ scroll
  MAX_SCROLLS: 500,           // Scroll สูงสุด 500 ครั้ง (ประมาณ 10,000+ ข้อความ)
  SCROLL_AMOUNT: 1000,        // Scroll ครั้งละ 1000 pixels
  FINISH_WAIT: 3000          // รอ 3 วินาทีหลัง scroll เสร็จ
};

// Find message container
function getMessageContainer() {
  // Try multiple selectors
  const selectors = [
    '[class*="messagesWrapper"]',
    '[class*="scroller"][class*="messages"]',
    '[data-list-id="chat-messages"]',
    '[class*="scrollerInner"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`✅ พบ message container: ${selector}`);
      return element;
    }
  }

  console.error("❌ ไม่พบ message container");
  return null;
}

// Auto-scroll to load old messages
async function autoScrollToTop() {
  const container = getMessageContainer();
  if (!container) {
    throw new Error("ไม่พบ message container");
  }

  console.log(`📜 กำลัง auto-scroll เพื่อโหลดข้อความ (max ${CONFIG.MAX_SCROLLS} ครั้ง)...`);

  let scrollCount = 0;
  let previousHeight = container.scrollHeight;
  let noChangeCount = 0;

  while (scrollCount < CONFIG.MAX_SCROLLS) {
    // Scroll up
    container.scrollTop = Math.max(0, container.scrollTop - CONFIG.SCROLL_AMOUNT);

    scrollCount++;

    // Show progress every 10 scrolls
    if (scrollCount % 10 === 0) {
      console.log(`   📊 Scrolled ${scrollCount}/${CONFIG.MAX_SCROLLS} ครั้ง...`);
    }

    // Wait for messages to load
    await new Promise(resolve => setTimeout(resolve, CONFIG.SCROLL_INTERVAL));

    // Check if new messages loaded
    const currentHeight = container.scrollHeight;
    if (currentHeight === previousHeight) {
      noChangeCount++;

      // If no change for 3 consecutive scrolls, we've reached the top
      if (noChangeCount >= 3) {
        console.log(`✅ ถึงด้านบนสุดแล้ว (ไม่มีข้อความเพิ่ม) หลัง ${scrollCount} ครั้ง`);
        break;
      }
    } else {
      noChangeCount = 0;
      previousHeight = currentHeight;
    }

    // Check if we're at the top
    if (container.scrollTop === 0) {
      console.log(`✅ Scroll ถึงด้านบนสุดแล้ว`);
      // Wait a bit more to ensure all messages loaded
      await new Promise(resolve => setTimeout(resolve, CONFIG.FINISH_WAIT));
      break;
    }
  }

  console.log(`✅ Auto-scroll เสร็จสิ้น! Scrolled ${scrollCount} ครั้ง`);
}

// Extract all messages
function extractMessages() {
  console.log("📥 กำลังดึงข้อความ...");

  const messages = [];

  // Try multiple message selectors
  const messageSelectors = [
    '[id^="chat-messages-"]',
    '[class*="message-"]',
    '[class*="messageListItem"]',
    'li[id^="chat-messages"]'
  ];

  let messageElements = [];
  for (const selector of messageSelectors) {
    messageElements = document.querySelectorAll(selector);
    if (messageElements.length > 0) {
      console.log(`✅ พบข้อความ ${messageElements.length} ข้อความด้วย selector: ${selector}`);
      break;
    }
  }

  if (messageElements.length === 0) {
    console.error("❌ ไม่พบข้อความ");
    return messages;
  }

  messageElements.forEach((msgEl, index) => {
    try {
      // Extract username
      let username = "Unknown";
      const usernameSelectors = [
        '[class*="username"]',
        '[class*="author"]',
        'h3[class*="header"] span'
      ];

      for (const sel of usernameSelectors) {
        const usernameEl = msgEl.querySelector(sel);
        if (usernameEl && usernameEl.textContent.trim()) {
          username = usernameEl.textContent.trim();
          break;
        }
      }

      // Extract timestamp
      let timestamp = new Date().toISOString();
      const timeEl = msgEl.querySelector('time');
      if (timeEl) {
        timestamp = timeEl.getAttribute('datetime') || timestamp;
      }

      // Extract message content
      let content = "";
      const contentSelectors = [
        '[class*="messageContent"]',
        '[class*="markup"]',
        'div[class*="content"] > div'
      ];

      for (const sel of contentSelectors) {
        const contentEl = msgEl.querySelector(sel);
        if (contentEl && contentEl.textContent.trim()) {
          content = contentEl.textContent.trim();
          break;
        }
      }

      // Extract attachments/links
      const links = [];
      msgEl.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('/channels/')) {
          links.push(href);
        }
      });

      // Extract code blocks
      const codeBlocks = [];
      msgEl.querySelectorAll('code, pre').forEach((code, i) => {
        const codeText = code.textContent.trim();
        if (codeText) {
          codeBlocks.push(`[CODE ${i+1}]: ${codeText}`);
        }
      });

      if (content || codeBlocks.length > 0 || links.length > 0) {
        messages.push({
          index: index + 1,
          username,
          timestamp,
          content,
          links,
          codeBlocks
        });
      }

    } catch (err) {
      console.warn(`⚠️  ไม่สามารถ parse ข้อความที่ ${index}:`, err.message);
    }
  });

  console.log(`✅ ดึงข้อความได้ ${messages.length} ข้อความ`);
  return messages;
}

// Format messages to text
function formatMessages(messages) {
  let output = "=".repeat(100) + "\n";
  output += "MegaETH Discord #builder Channel - Full Export\n";
  output += `Exported: ${new Date().toISOString()}\n`;
  output += `Total Messages: ${messages.length}\n`;
  output += "=".repeat(100) + "\n\n";

  messages.forEach((msg, i) => {
    output += `[${ msg.timestamp}] ${msg.username}:\n`;

    if (msg.content) {
      output += `${msg.content}\n`;
    }

    if (msg.codeBlocks.length > 0) {
      output += `\n${msg.codeBlocks.join('\n')}\n`;
    }

    if (msg.links.length > 0) {
      output += `\nLinks: ${msg.links.join(', ')}\n`;
    }

    output += "-".repeat(100) + "\n\n";
  });

  return output;
}

// Download as file
function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log(`✅ ไฟล์ ${filename} ถูก download แล้ว!`);
}

// Main function
async function exportDiscordMessages() {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("เริ่มต้น Export Discord Messages");
    console.log("=".repeat(80) + "\n");

    // Step 1: Auto-scroll to load all messages
    console.log("📍 ขั้นตอนที่ 1: Auto-scroll เพื่อโหลดข้อความทั้งหมด");
    await autoScrollToTop();

    // Step 2: Extract messages
    console.log("\n📍 ขั้นตอนที่ 2: ดึงข้อความทั้งหมด");
    const messages = extractMessages();

    if (messages.length === 0) {
      throw new Error("ไม่พบข้อความ");
    }

    // Step 3: Format and download
    console.log("\n📍 ขั้นตอนที่ 3: Format และ download");
    const formattedText = formatMessages(messages);
    const filename = `builder-messages-${new Date().getTime()}.txt`;
    downloadFile(formattedText, filename);

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("✅ Export สำเร็จ!");
    console.log(`📊 ดึงข้อความได้: ${messages.length} ข้อความ`);
    console.log(`📄 ไฟล์: ${filename}`);
    console.log("=".repeat(80) + "\n");

    return messages;

  } catch (error) {
    console.error("\n❌ Export ล้มเหลว:", error);
    console.error(error.stack);
    throw error;
  }
}

// Run the export
console.log("⚡ กด Enter เพื่อเริ่มต้น...\n");
exportDiscordMessages();
