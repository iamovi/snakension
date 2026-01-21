// Background service worker to detect offline status
let wasOffline = false;

// Check connection status
function checkConnection() {
  const isOnline = navigator.onLine;
  
  if (!isOnline && !wasOffline) {
    // Just went offline - show notification and badge
    wasOffline = true;
    
    // Update badge to show offline
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    
    // Show notification
    try {
      chrome.notifications.create('offline-notification', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'You\'re Offline!',
        message: 'Click the Snakension icon to play Snake!',
        priority: 2,
        requireInteraction: false
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.log('Notification error:', chrome.runtime.lastError);
        }
      });
    } catch (error) {
      console.log('Error creating notification:', error);
    }
    
  } else if (isOnline && wasOffline) {
    // Back online
    wasOffline = false;
    chrome.action.setBadgeText({ text: '' });
    
    try {
      chrome.notifications.clear('offline-notification');
    } catch (error) {
      console.log('Error clearing notification:', error);
    }
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'popupOpened') {
    // Clear badge and notification when popup opens
    chrome.action.setBadgeText({ text: '' });
    try {
      chrome.notifications.clear('offline-notification');
    } catch (error) {
      console.log('Error clearing notification:', error);
    }
    sendResponse({ success: true });
  }
  return true;
});

// Listen for notification click
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'offline-notification') {
    // Clear the notification and badge
    chrome.action.setBadgeText({ text: '' });
    chrome.notifications.clear('offline-notification');
    
    // Open the extension in a new tab instead of popup
    chrome.tabs.create({ url: 'popup.html' });
  }
});

// Listen for online/offline events
self.addEventListener('online', () => {
  wasOffline = false;
  chrome.action.setBadgeText({ text: '' });
  
  try {
    chrome.notifications.clear('offline-notification');
  } catch (error) {
    console.log('Error clearing notification:', error);
  }
});

self.addEventListener('offline', () => {
  if (!wasOffline) {
    checkConnection();
  }
});

// Check connection periodically (every 3 seconds)
setInterval(checkConnection, 3000);

// Initial check
checkConnection();

// Also check when service worker starts
chrome.runtime.onStartup.addListener(() => {
  checkConnection();
});

chrome.runtime.onInstalled.addListener(() => {
  checkConnection();
});