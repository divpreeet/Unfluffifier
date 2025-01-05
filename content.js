// unfluffifier 

function showStatus(message) {
  let statusDiv = document.getElementById('summarizer-status');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.id = 'summarizer-status';
    statusDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #1e1c1e;
      color: white;
      border-radius: 4px;
      z-index: 999999;
      font-family: Inter, sans-serif;
    `;
    document.body.appendChild(statusDiv);
  }
  statusDiv.textContent = message;
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (statusDiv.parentNode) {
      statusDiv.parentNode.removeChild(statusDiv);
    }
  }, 3000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'summarize') {
    summarizeArticle()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  }
});

async function summarizeArticle() {
  try {
    showStatus('Extracting article content...');
    const articleText = extractArticleContent();
    if (!articleText) {
      throw new Error('No article content found');
    }
    
    showStatus('Generating summary...');
    const summary = await getSummary(articleText);
    
    showStatus('Displaying summary...');
    displayReaderMode(summary);
    
    return { success: true };
  } catch (error) {
    console.error('Summarization error:', error);
    showStatus('Error: ' + error.message);
    throw error;
  }
}

function extractArticleContent() {
  const vergeSelectors = [
    '.duet--article--article-body-component',
    '.c-entry-content',
    '.l-wrapper',
    '.article-content'
  ];

  for (const selector of vergeSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const paragraphs = Array.from(element.querySelectorAll('p'))
        .map(p => p.textContent.trim())
        .filter(text => text.length > 0);
      
      if (paragraphs.length > 0) {
        return paragraphs.join('\n\n');
      }
    }
  }

  const article = document.querySelector('article');
  if (article) {
    const paragraphs = Array.from(article.querySelectorAll('p'))
      .map(p => p.textContent.trim())
      .filter(text => text.length > 0);
    
    if (paragraphs.length > 0) {
      return paragraphs.join('\n\n');
    }
  }

  const allParagraphs = Array.from(document.querySelectorAll('p'))
    .map(p => p.textContent.trim())
    .filter(text => text.length > 50)
    .join('\n\n');

  return allParagraphs || null;
}

async function getSummary(text) {
  try {
    const API_KEY = 'hehe-no-api-for-you';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Please summarize this article concisely, organizing the summary into these sections: Main Points, Key Details, and Conclusion. Also dont add any asterisks to the text, Here's the article: ${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}
function displayReaderMode(summary) {
  // Create wrapper for original content
  const wrapper = document.createElement('div');
  wrapper.id = 'original-content-wrapper';
  wrapper.style.display = 'none';
  
  // Move all body content to wrapper
  while (document.body.firstChild) {
    wrapper.appendChild(document.body.firstChild);
  }
  document.body.appendChild(wrapper);
  
  // Create reader mode container
  const container = document.createElement('div');
  container.id = 'reader-mode-container';
  container.innerHTML = `
    <div style="
      border-radius: 6px;
      max-width: 680px;
      margin: 40px auto;
      font-family: 'Inter', serif;
      font-weight:600;
      font-size: 18px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      background: white;
    ">
      <button id="restoreBtn" style="
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');

        position: fixed;
        top: 20px;
        right: 20px;
        padding: 8px 16px;
        background: white;
        color: black;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        z-index: 9999;
      ">Show Original</button>
      <h1 style="font-size: 32px; margin-bottom: 24px;">Article Summary</h1>
      <div id="summary" style="white-space: pre-line;">${summary}</div>
    </div>
  `;
  document.body.appendChild(container);

  // Add event listener to restore button
  document.getElementById('restoreBtn').addEventListener('click', () => {
    document.getElementById('reader-mode-container').remove();
    document.getElementById('original-content-wrapper').style.display = 'block';
  });
}

// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('summarizeBtn');
  const status = document.getElementById('status');

  btn.addEventListener('click', async () => {
    try {
      status.textContent = 'Summarizing...';
      
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      await chrome.tabs.executeScript(tab.id, {
        file: 'content.js'
      });

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'summarize'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to summarize article');
      }
      
      window.close();
    } catch (error) {
      status.textContent = 'Error: ' + error.message;
      console.error('Popup error:', error);
    }
  });
});