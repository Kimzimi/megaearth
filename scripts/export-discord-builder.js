#!/usr/bin/env node

/**
 * Discord Builder Channel Export Script
 *
 * วิธีใช้:
 * 1. ไปที่ Discord MegaETH Server
 * 2. เปิด Developer Tools (F12 หรือ Cmd+Option+I บน Mac)
 * 3. ไปที่ tab "Console"
 * 4. Copy code ด้านล่างทั้งหมดแล้ว paste ใน Console
 * 5. กด Enter
 * 6. รอซักครู่ messages จะถูก download เป็นไฟล์ builder-messages.txt
 */

console.log("🔄 Starting Discord #builder channel export...");

// Function to extract messages from Discord
async function exportBuilderMessages() {
  try {
    // ดึง messages จากหน้าจอ Discord
    const messages = [];

    // หา message containers
    const messageElements = document.querySelectorAll('[id^="chat-messages-"] [class*="message"]');

    console.log(`📊 Found ${messageElements.length} messages`);

    messageElements.forEach((msg, index) => {
      try {
        // ดึง username
        const usernameEl = msg.querySelector('[class*="username"]');
        const username = usernameEl ? usernameEl.textContent.trim() : 'Unknown';

        // ดึง timestamp
        const timestampEl = msg.querySelector('time');
        const timestamp = timestampEl ? timestampEl.getAttribute('datetime') : new Date().toISOString();

        // ดึง message content
        const contentEl = msg.querySelector('[class*="messageContent"]');
        const content = contentEl ? contentEl.textContent.trim() : '';

        if (content) {
          messages.push({
            index: index + 1,
            username,
            timestamp,
            content
          });
        }
      } catch (err) {
        console.warn(`⚠️  Could not parse message ${index}:`, err.message);
      }
    });

    // สร้าง text output
    let output = '='.repeat(80) + '\n';
    output += 'MegaETH Discord #builder Channel Export\n';
    output += `Exported: ${new Date().toISOString()}\n`;
    output += `Total Messages: ${messages.length}\n`;
    output += '='.repeat(80) + '\n\n';

    messages.forEach(msg => {
      output += `[${msg.timestamp}] ${msg.username}:\n`;
      output += `${msg.content}\n`;
      output += '-'.repeat(80) + '\n\n';
    });

    // Download as file
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'builder-messages.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ Export complete! File downloaded as builder-messages.txt');
    console.log(`📝 Exported ${messages.length} messages`);

    return messages;

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

// Run the export
exportBuilderMessages();
