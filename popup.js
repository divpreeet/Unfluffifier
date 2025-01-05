// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('summarizeBtn');
  const status = document.getElementById('status');

  btn.addEventListener('click', async () => {
    try {
      status.textContent = 'Summarizing...';
      
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
      });
      
      if (!tabs[0]) {
        throw new Error('No active tab found');
      }

      // Inject the content script
      await browser.tabs.executeScript(tabs[0].id, {
        file: 'content.js'
      });

      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Send message to the content script
      await browser.tabs.sendMessage(tabs[0].id, {
        action: 'summarize'
      });
      
      window.close();
    } catch (error) {
      status.textContent = 'Error: ' + error.message;
      console.error('Popup error:', error);
    }
  });
});