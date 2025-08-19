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
        try {
            currentUser = JSON.parse(storedUser);
            if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
                window.location.href = "chat.html";
            }
            requestPermissions();
        } catch (error) {
            console.error('Error parsing stored user:', error);
            localStorage.removeItem('currentUser');
        }
    }

    // Initialize auth forms if present
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
});

// ----------------------
// Enhanced Error Handling
// ----------------------
function showErrorMessage(message) {
    if (typeof window.showMessage === 'function') {
        window.showMessage(message, 'error');
    } else {
        alert(message);
    }
}

function showSuccessMessage(message) {
    if (typeof window.showMessage === 'function') {
        window.showMessage(message, 'success');
    } else {
        alert(message);
    }
}

// ----------------------
// Improved Signup Function
// ----------------------
async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    // Basic validation
    if (!name || !email || !password) {
        showErrorMessage('Please fill in all fields');
        return;
    }

    if (password.length < 6) {
        showErrorMessage('Password must be at least 6 characters long');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;

    try {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    name: name,
                    display_name: name
                }
            }
        });

        if (error) {
            throw error;
        }

        if (data.user && !data.session) {
            showSuccessMessage("Please check your email to confirm your account, then login.");
            switchToLogin();
        } else if (data.user && data.session) {
            showSuccessMessage("Account created successfully!");

            // Store user data locally
            currentUser = { 
                id: data.user.id, 
                name: name, 
                email: data.user.email 
            };

            if (!localStorage.getItem('userUsername')) {
                const randomUsername = generateRandomUsername();
                localStorage.setItem('userUsername', randomUsername);
            }

            localStorage.setItem("currentUser", JSON.stringify(currentUser));

            setTimeout(() => {
                window.location.href = "chat.html";
            }, 1000);
        }
    } catch (err) {
        console.error('Signup error:', err);
        let errorMessage = 'Signup failed. Please try again.';

        if (err.message.includes('already registered')) {
            errorMessage = 'This email is already registered. Please login instead.';
        } else if (err.message.includes('Invalid email')) {
            errorMessage = 'Please enter a valid email address.';
        } else if (err.message.includes('Password')) {
            errorMessage = 'Password must be at least 6 characters long.';
        }

        showErrorMessage(errorMessage);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ----------------------
// Improved Login Function
// ----------------------
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showErrorMessage('Please enter both email and password');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    submitBtn.disabled = true;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ 
            email: email.toLowerCase(), 
            password 
        });

        if (error) {
            throw error;
        }

        if (!data.user) {
            throw new Error("Login failed - no user data received");
        }

        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
            showErrorMessage('Please confirm your email address before logging in. Check your inbox for a confirmation email.');
            return;
        }

        // Use user metadata for name, fallback to email if no name
        const userName = data.user.user_metadata?.name || 
                        data.user.user_metadata?.display_name || 
                        data.user.email.split('@')[0];

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

        showSuccessMessage('Login successful! Redirecting...');

        setTimeout(() => {
            window.location.href = "chat.html";
        }, 1000);

    } catch (err) {
        console.error('Login error:', err);
        let errorMessage = 'Login failed. Please check your credentials.';

        if (err.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please try again.';
        } else if (err.message.includes('Email not confirmed')) {
            errorMessage = 'Please confirm your email address before logging in.';
        } else if (err.message.includes('Too many requests')) {
            errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        }

        showErrorMessage(errorMessage);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ----------------------
// Logout Function
// ----------------------
async function logout() {
    try {
        await supabase.auth.signOut();
        localStorage.clear();
        currentUser = null;
        showSuccessMessage('Logged out successfully');
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if there's an error
        localStorage.clear();
        currentUser = null;
        window.location.href = "index.html";
    }
}

// ----------------------
// Upload Image/Video
// ----------------------
async function uploadMedia(file) {
    if (!file) return null;

    try {
        const storageRef = ref(storage, `media/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return url;
    } catch (error) {
        console.error('Upload error:', error);
        showErrorMessage('Failed to upload media. Please try again.');
        return null;
    }
}

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

function isProfileComplete() {
    const storedUser = localStorage.getItem('currentUser');
    const username = localStorage.getItem('userUsername');
    const bio = localStorage.getItem('userBio');

    if (!storedUser) return false;

    try {
        const user = JSON.parse(storedUser);
        return user.name && 
               user.name.trim() !== '' && 
               username && 
               username.trim() !== '' &&
               bio && 
               bio.trim() !== '';
    } catch {
        return false;
    }
}

// ----------------------
// Permission Management
// ----------------------
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

            this.savePermissionState('camera', 'granted');
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            this.savePermissionState('camera', 'denied');
            return false;
        }
    }

    async requestStoragePermission() {
        try {
            if ('showOpenFilePicker' in window) {
                this.savePermissionState('storage', 'granted');
                return true;
            }

            this.savePermissionState('storage', 'granted');
            return true;
        } catch (error) {
            this.savePermissionState('storage', 'denied');
            return false;
        }
    }

    allPermissionsGranted() {
        return Object.values(this.permissions).every(
            state => state === 'granted' || state === 'not_supported'
        );
    }

    async checkAndRequestPermissions() {
        if (!this.allPermissionsGranted()) {
            const granted = await this.requestAllPermissions();
            if (granted) {
                this.showPermissionSuccessNotification();
            }
        }
        return this.allPermissionsGranted();
    }

    showPermissionSuccessNotification() {
        if (typeof window.showMessage === 'function') {
            window.showMessage('Camera and storage permissions granted!', 'success');
        }
    }
}

// Initialize permission manager
const permissionManager = new PermissionManager();
window.permissionManager = permissionManager;

async function requestPermissions() {
    try {
        return await permissionManager.checkAndRequestPermissions();
    } catch (error) {
        console.error('Error in permission initialization:', error);
        return false;
    }
}

// ----------------------
// Utility Functions
// ----------------------
function switchToSignup() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
}

function switchToLogin() {
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

function openSettings() {
    window.location.href = 'settings.html';
}

function openFindFriends() {
    window.location.href = 'find-friend.html';
}

// Contact management functions
function showAddContactModal() {
    document.getElementById('addContactModal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput || !messageInput.value.trim()) return;

    const message = messageInput.value.trim();
    messageInput.value = '';

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

// Add missing functions
function showEmailInput() {
    const emailSection = document.getElementById('emailInputSection');
    if (emailSection) {
        emailSection.classList.remove('hidden');
    }
}

function requestPhoneContacts() {
    if (typeof window.showMessage === 'function') {
        window.showMessage('Phone contacts import coming soon!', 'info');
    } else {
        alert('Phone contacts import coming soon!');
    }
}

function addContactByEmail() {
    const emailInput = document.getElementById('contactEmail');
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    if (!email) {
        if (typeof window.showMessage === 'function') {
            window.showMessage('Please enter an email address', 'error');
        } else {
            alert('Please enter an email address');
        }
        return;
    }
    
    if (typeof window.showMessage === 'function') {
        window.showMessage('Contact request sent!', 'success');
    } else {
        alert('Contact request sent!');
    }
    
    closeModal('addContactModal');
    emailInput.value = '';
}

function toggleEmojiPicker() {
    const emojiPicker = document.getElementById('emojiPicker');
    if (emojiPicker) {
        emojiPicker.classList.toggle('hidden');
    }
}

function insertEmoji(emoji) {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.value += emoji;
        messageInput.focus();
    }
}

function openMediaSelector() {
    const mediaInput = document.getElementById('mediaInput');
    if (mediaInput) {
        mediaInput.click();
    }
}

// Make functions globally available
window.switchToSignup = switchToSignup;
window.switchToLogin = switchToLogin;
window.logout = logout;
window.openSettings = openSettings;
window.openFindFriends = openFindFriends;
window.showAddContactModal = showAddContactModal;
window.closeModal = closeModal;
window.sendMessage = sendMessage;
window.showEmailInput = showEmailInput;
window.requestPhoneContacts = requestPhoneContacts;
window.addContactByEmail = addContactByEmail;
window.toggleEmojiPicker = toggleEmojiPicker;
window.insertEmoji = insertEmoji;
window.openMediaSelector = openMediaSelector;

// Export for other modules
export { currentUser, uploadMedia, supabase, logout };