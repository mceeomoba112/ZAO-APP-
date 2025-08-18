// ----------------------
// ZAO APP - Frontend JS
// Supabase & Firebase Configuration
// ----------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBZOir1TzbFlMDw2q9lQyACRLp19UTZKC4",
  authDomain: "zao-app-ca76f.firebaseapp.com",
  projectId: "zao-app-ca76f",
  storageBucket: "zao-app-ca76f.appspot.com",
  messagingSenderId: "42789375098",
  appId: "1:42789375098:web:c217ff5241997672a63fc3"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

// Supabase config
const SUPABASE_URL = 'https://crmyrtgyxbmkhlzctapu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNybXlydGd5eGJta2hsemN0YXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTEwODcsImV4cCI6MjA3MTA4NzA4N30.bbj-zsXgJU-FBMCTs_WLfk0JYiydkhmr--O2b9Iiqbc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----------------------
// Global Variables
// ----------------------
let currentUser = null;

// ----------------------
// DOMContentLoaded
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
            window.location.href = "chat.html";
        }
        // Request permissions for logged in users
        requestPermissions();
    }

    // Initialize auth forms if present
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
});

// ----------------------
// Signup Function
// ----------------------
async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    name: name
                }
            }
        });
        if (error) throw error;

        if (data.user && !data.session) {
            alert("Please check your email to confirm your account, then login.");
        } else {
            alert("Signup successful! Please login.");
        }
        switchToLogin();
    } catch (err) {
        alert(err.message);
    }
}

// ----------------------
// Login Function
// ----------------------
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (!data.user) {
            throw new Error("Login failed - no user data received");
        }

        // Use user metadata for name, fallback to email if no name
        const userName = data.user.user_metadata?.name || data.user.email.split('@')[0];

        currentUser = { 
            id: data.user.id, 
            name: userName, 
            email: data.user.email 
        };

        // Generate random username if not exists
        if (!localStorage.getItem('userUsername')) {
            const randomUsername = generateRandomUsername();
            localStorage.setItem('userUsername', randomUsername);
        }

        localStorage.setItem("currentUser", JSON.stringify(currentUser));

        // Check if profile is complete before going to chat
        if (isProfileComplete()) {
            window.location.href = "chat.html";
        } else {
            window.location.href = "settings.html";
            alert("Please complete your profile settings to continue.");
        }
    } catch (err) {
        alert(err.message);
    }
}

// ----------------------
// Logout Function
// ----------------------
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    supabase.auth.signOut();
    window.location.href = "index.html";
}

// ----------------------
// Upload Image/Video
// ----------------------
async function uploadMedia(file) {
    if (!file) return null;

    const storageRef = ref(storage, `media/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
}

// ----------------------
// Add online presence placeholder
// ----------------------
async function setUserOnlineStatus(isOnline) {
    if (!currentUser) return;
    // Note: Online status would need a proper table setup with RLS policies
    // For now, this is disabled to avoid RLS issues
    console.log(`User ${currentUser.name} is ${isOnline ? 'online' : 'offline'}`);
}

// Automatically set online/offline
window.addEventListener('beforeunload', () => setUserOnlineStatus(false));
window.addEventListener('load', () => setUserOnlineStatus(true));

// ----------------------
// Utilities: Switch forms
// ----------------------
function switchToSignup() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
}

function switchToLogin() {
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

// Settings navigation
function openSettings() {
    window.location.href = 'settings.html';
}

// Read receipts functionality
function updateReadReceipts() {
    const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    return preferences.readReceipts !== false;
}

// Apply user preferences on page load
function applyUserPreferences() {
    const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');

    // Apply dark mode
    if (preferences.darkMode) {
        document.body.classList.add('dark-mode');
    }

    // Apply chat background
    const chatBackground = localStorage.getItem('chatBackground');
    if (chatBackground) {
        const messagesArea = document.getElementById('messagesContainer');
        if (messagesArea) {
            messagesArea.style.backgroundImage = `url(${chatBackground})`;
            messagesArea.style.backgroundSize = 'cover';
            messagesArea.style.backgroundPosition = 'center';
        }
    }
}

// Apply preferences when page loads
document.addEventListener('DOMContentLoaded', () => {
    applyUserPreferences();
});

// Contact management functions
function showAddContactModal() {
    document.getElementById('addContactModal').classList.remove('hidden');
}

function showEmailInput() {
    document.getElementById('emailInputSection').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    // Reset email input section
    if (modalId === 'addContactModal') {
        document.getElementById('emailInputSection').classList.add('hidden');
        document.getElementById('contactEmail').value = '';
    }
}

async function addContactByEmail() {
    const email = document.getElementById('contactEmail').value.trim();
    if (!email) {
        alert('Please enter a valid email address');
        return;
    }

    // Add contact to local storage for now
    const contacts = JSON.parse(localStorage.getItem('userContacts') || '[]');
    const newContact = {
        id: Date.now(),
        name: email.split('@')[0],
        email: email,
        lastMessage: 'Click to start messaging',
        timestamp: new Date().toISOString()
    };

    contacts.push(newContact);
    localStorage.setItem('userContacts', JSON.stringify(contacts));

    // Refresh contacts list
    loadContacts();
    closeModal('addContactModal');

    alert('Contact added successfully!');
}

function requestPhoneContacts() {
    if (navigator.contacts) {
        // This would work in a native app context
        navigator.contacts.find(['displayName', 'phoneNumbers'], 
            (contacts) => {
                console.log('Contacts found:', contacts);
                // Process and display contacts
            },
            (error) => {
                console.error('Error accessing contacts:', error);
                alert('Cannot access phone contacts in web browser. Please add contacts by email.');
            }
        );
    } else {
        alert('Phone contacts access is not available in web browsers. Please add contacts by email instead.');
    }
}

function loadContacts() {
    const contacts = JSON.parse(localStorage.getItem('userContacts') || '[]');
    const contactsList = document.getElementById('contactsList');

    if (!contactsList) return;

    contactsList.innerHTML = '';

    contacts.forEach(contact => {
        const contactElement = document.createElement('div');
        contactElement.className = 'contact-item';
        contactElement.innerHTML = `
            <div class="contact-avatar">
                ${contact.name.charAt(0).toUpperCase()}
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-last-message">${contact.lastMessage}</div>
            </div>
            <div class="contact-meta">
                <span class="contact-time">Now</span>
            </div>
        `;

        contactElement.addEventListener('click', () => selectContact(contact));
        contactsList.appendChild(contactElement);
    });
}

function selectContact(contact) {
    // Update chat header
    document.getElementById('currentChatUser').textContent = contact.name;
    document.querySelector('.last-seen').textContent = `Email: ${contact.email}`;

    // Enable message input
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    if (messageInput && sendButton) {
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.placeholder = `Message ${contact.name}...`;
    }

    // Clear welcome message and show empty chat
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.innerHTML = '<div class="chat-empty"><p>Start your conversation with ' + contact.name + '</p></div>';
    }

    // Mark contact as active
    document.querySelectorAll('.contact-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget?.classList.add('active');
}

// Enhanced media functionality
function openMediaSelector() {
    document.getElementById('mediaInput').click();
}

// Emoji picker functionality
function toggleEmojiPicker() {
    const emojiPicker = document.getElementById('emojiPicker');
    emojiPicker.classList.toggle('hidden');
}

function insertEmoji(emoji) {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.value += emoji;
        messageInput.focus();
    }
    document.getElementById('emojiPicker').classList.add('hidden');
}

// Load profile picture on page load
function loadProfilePicture() {
    const profilePicture = localStorage.getItem('profilePicture');
    const userProfileImage = document.getElementById('userProfileImage');
    const defaultUserIcon = document.getElementById('defaultUserIcon');

    if (profilePicture && userProfileImage && defaultUserIcon) {
        userProfileImage.src = profilePicture;
        userProfileImage.style.display = 'block';
        defaultUserIcon.style.display = 'none';
    }
}

// Enhanced DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Existing code...
    loadContacts();
    loadProfilePicture();

    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        const emojiPicker = document.getElementById('emojiPicker');
        const emojiBtn = document.querySelector('.emoji-btn');

        if (emojiPicker && !emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
            emojiPicker.classList.add('hidden');
        }
    });
});

// ----------------------
// Username Generation and Profile Completion
// ----------------------

function generateRandomUsername() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'ZAO-';
    for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Simplified permission management - only camera and storage
class PermissionManager {
    constructor() {
        this.permissions = {
            camera: 'not_requested',
            storage: 'not_requested'
        };
        this.loadPermissionStates();
    }

    loadPermissionStates() {
        Object.keys(this.permissions).forEach(permission => {
            const stored = localStorage.getItem(`${permission}Permission`);
            if (stored) {
                this.permissions[permission] = stored;
            }
        });
    }

    savePermissionState(permission, state) {
        this.permissions[permission] = state;
        localStorage.setItem(`${permission}Permission`, state);
    }

    async requestAllPermissions() {
        if (this.allPermissionsGranted()) {
            console.log('All permissions already granted');
            return true;
        }

        try {
            await this.requestCameraPermission();
            await this.requestStoragePermission();
            return this.allPermissionsGranted();
        } catch (error) {
            console.error('Error requesting permissions:', error);
            return false;
        }
    }

    async requestCameraPermission() {
        if (this.permissions.camera === 'granted') return true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
            });
            
            console.log('Camera permission granted');
            this.savePermissionState('camera', 'granted');
            
            // Stop the stream immediately after getting permission
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.log('Camera permission denied:', error);
            this.savePermissionState('camera', 'denied');
            return false;
        }
    }

    async requestStoragePermission() {
        try {
            // Check if File System Access API is available
            if ('showOpenFilePicker' in window) {
                this.savePermissionState('storage', 'granted');
                console.log('File system access available');
                return true;
            }

            // Fallback: Check if we can create a temporary file input
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx';
            
            this.savePermissionState('storage', 'granted');
            console.log('File access available via input');
            return true;
        } catch (error) {
            console.log('Storage permission error:', error);
            this.savePermissionState('storage', 'denied');
            return false;
        }
    }

    allPermissionsGranted() {
        return Object.values(this.permissions).every(
            state => state === 'granted' || state === 'not_supported'
        );
    }

    getPermissionStatus(permission) {
        return this.permissions[permission];
    }

    async checkAndRequestPermissions() {
        if (!this.allPermissionsGranted()) {
            const granted = await this.requestAllPermissions();
            if (granted) {
                this.showPermissionSuccessNotification();
            } else {
                this.showPermissionWarningNotification();
            }
        }
        return this.allPermissionsGranted();
    }

    showPermissionSuccessNotification() {
        this.showNotification('Camera and storage permissions granted!', 'success');
    }

    showPermissionWarningNotification() {
        this.showNotification('Some permissions were denied. Camera and file features may not work properly.', 'warning');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `permission-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #48bb78, #38a169)' : 
                         type === 'warning' ? 'linear-gradient(135deg, #ed8936, #dd6b20)' : 
                         'linear-gradient(135deg, #4299e1, #3182ce)'};
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize permission manager
const permissionManager = new PermissionManager();

// Make globally available
window.permissionManager = permissionManager;

// Request permissions on app initialization
async function requestPermissions() {
    try {
        return await permissionManager.checkAndRequestPermissions();
    } catch (error) {
        console.error('Error in permission initialization:', error);
        return false;
    }
}

function isProfileComplete() {
    const storedUser = localStorage.getItem('currentUser');
    const username = localStorage.getItem('userUsername');
    const bio = localStorage.getItem('userBio');

    if (!storedUser) return false;

    const user = JSON.parse(storedUser);

    // Check if required fields are complete (username is now mandatory)
    return user.name && 
           user.name.trim() !== '' && 
           username && 
           username.trim() !== '' &&
           bio && 
           bio.trim() !== '';
}

// Missing modal and navigation functions
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function openFindFriends() {
    window.location.href = 'find-friends.html';
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const header = section.previousElementSibling;
        const icon = header?.querySelector('.toggle-icon');

        section.classList.toggle('expanded');
        if (icon) {
            icon.classList.toggle('rotated');
        }
    }
}



// Enhanced search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length > 0) {
                performSearch(query);
            } else {
                clearSearchResults();
            }
        });
    }
}

function performSearch(query) {
    const contacts = JSON.parse(localStorage.getItem('userContacts') || '[]');
    const messages = JSON.parse(localStorage.getItem('chatMessages') || '{}');
    
    // Search in contacts
    const contactResults = contacts.filter(contact => 
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query)
    );
    
    // Search in messages
    const messageResults = [];
    Object.keys(messages).forEach(contactId => {
        const contactMessages = messages[contactId] || [];
        contactMessages.forEach(message => {
            if (message.text && message.text.toLowerCase().includes(query)) {
                messageResults.push({
                    contactId,
                    message,
                    contactName: contacts.find(c => c.id == contactId)?.name || 'Unknown'
                });
            }
        });
    });
    
    displaySearchResults(contactResults, messageResults, query);
}

function displaySearchResults(contacts, messages, query) {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;
    
    contactsList.innerHTML = `
        <div class="search-results">
            <div class="search-header">
                <h4>Search Results for "${query}"</h4>
                <button onclick="clearSearchResults()" class="clear-search-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            ${contacts.length > 0 ? `
                <div class="search-section">
                    <h5><i class="fas fa-user"></i> Contacts (${contacts.length})</h5>
                    ${contacts.map(contact => `
                        <div class="search-result-item contact-result" onclick="selectContact(${JSON.stringify(contact).replace(/"/g, '&quot;')})">
                            <div class="contact-avatar">${contact.name.charAt(0).toUpperCase()}</div>
                            <div class="contact-info">
                                <div class="contact-name">${highlightMatch(contact.name, query)}</div>
                                <div class="contact-email">${highlightMatch(contact.email, query)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${messages.length > 0 ? `
                <div class="search-section">
                    <h5><i class="fas fa-comment"></i> Messages (${messages.length})</h5>
                    ${messages.map(msg => `
                        <div class="search-result-item message-result" onclick="openMessageInChat('${msg.contactId}', '${msg.message.id}')">
                            <div class="message-contact">${msg.contactName}</div>
                            <div class="message-preview">${highlightMatch(msg.message.text, query)}</div>
                            <div class="message-time">${formatTime(msg.message.timestamp)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${contacts.length === 0 && messages.length === 0 ? `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No results found for "${query}"</p>
                </div>
            ` : ''}
        </div>
    `;
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function clearSearchResults() {
    document.getElementById('searchInput').value = '';
    loadContacts(); // Restore normal contacts view
}

function openMessageInChat(contactId, messageId) {
    // Find and select the contact
    const contacts = JSON.parse(localStorage.getItem('userContacts') || '[]');
    const contact = contacts.find(c => c.id == contactId);
    
    if (contact) {
        selectContact(contact);
        
        // Highlight the specific message if possible
        setTimeout(() => {
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                messageElement.classList.add('highlighted-message');
                setTimeout(() => {
                    messageElement.classList.remove('highlighted-message');
                }, 3000);
            }
        }, 500);
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString();
    }
}

// Initialize search on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize search
    initializeSearch();
});

// Make functions globally available
window.switchToSignup = switchToSignup;
window.switchToLogin = switchToLogin;
window.logout = logout;
window.openSettings = openSettings;
window.updateReadReceipts = updateReadReceipts;
window.showAddContactModal = showAddContactModal;
window.showEmailInput = showEmailInput;
window.closeModal = closeModal;
window.addContactByEmail = addContactByEmail;
window.requestPhoneContacts = requestPhoneContacts;
window.openMediaSelector = openMediaSelector;
window.toggleEmojiPicker = toggleEmojiPicker;
window.insertEmoji = insertEmoji;
window.openModal = openModal;
window.openFindFriends = openFindFriends;
window.toggleSection = toggleSection;

// Add missing sendMessage function
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput || !messageInput.value.trim()) return;

    const message = messageInput.value.trim();
    messageInput.value = '';

    // Add message to chat (basic implementation)
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message sent';
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
                <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        `;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Make sendMessage globally available
window.sendMessage = sendMessage;

// Export for chat.js if needed
export { currentUser, uploadMedia, supabase, logout, updateReadReceipts };
