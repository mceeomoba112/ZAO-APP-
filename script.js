
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
let currentConversation = null;
let messagesInterval = null;

// ----------------------
// DOMContentLoaded
// ----------------------
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');

    // Check current authentication state from Supabase
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user) {
            // User is authenticated
            console.log('User is authenticated:', session.user);

            const userName = session.user.user_metadata?.name || 
                            session.user.user_metadata?.display_name || 
                            session.user.email.split('@')[0];

            currentUser = { 
                id: session.user.id, 
                name: userName, 
                email: session.user.email 
            };

            localStorage.setItem("currentUser", JSON.stringify(currentUser));

            // Generate username if not exists
            if (!localStorage.getItem('userUsername')) {
                const randomUsername = generateRandomUsername();
                localStorage.setItem('userUsername', randomUsername);
            }

            // Redirect to chat-list if on login page
            if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
                window.location.href = "chat-list.html";
                return;
            }

            // Sync user data and load conversations if on chat page
            if (window.location.pathname.includes("chat.html") || window.location.pathname.includes("chat-list.html")) {
                await syncUserToSupabase();
                loadConversations();

                // Update user profile display
                const userNameElement = document.getElementById('currentUserName');
                if (userNameElement) {
                    userNameElement.textContent = currentUser.name;
                }

                // Update user avatar
                const profilePicture = localStorage.getItem('profilePicture');
                if (profilePicture) {
                    const userProfileImage = document.getElementById('userProfileImage');
                    const defaultUserIcon = document.getElementById('defaultUserIcon');
                    if (userProfileImage && defaultUserIcon) {
                        userProfileImage.src = profilePicture;
                        userProfileImage.style.display = 'block';
                        defaultUserIcon.style.display = 'none';
                    }
                }
            }

            requestPermissions();
        } else {
            // No active session
            console.log('No active session found');
            currentUser = null;
            localStorage.removeItem('currentUser');

            // Redirect to login if not already there
            if (!window.location.pathname.includes("index.html") && window.location.pathname !== "/") {
                window.location.href = "index.html";
                return;
            }
        }
    } catch (error) {
        console.error('Error checking authentication state:', error);
        currentUser = null;
        localStorage.removeItem('currentUser');
    }

    // Initialize auth forms if present
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');

    if (loginForm) {
        console.log('Login form found, adding event listener');
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        console.log('Signup form found, adding event listener');
        signupForm.addEventListener('submit', handleSignup);
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);

        if (event === 'SIGNED_IN' && session) {
            const userName = session.user.user_metadata?.name || 
                            session.user.user_metadata?.display_name || 
                            session.user.email.split('@')[0];

            currentUser = { 
                id: session.user.id, 
                name: userName, 
                email: session.user.email 
            };

            localStorage.setItem("currentUser", JSON.stringify(currentUser));

            if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
                window.location.href = "chat-list.html";
            }
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            localStorage.clear();

            if (!window.location.pathname.includes("index.html") && window.location.pathname !== "/") {
                window.location.href = "index.html";
            }
        }
    });
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
                window.location.href = "chat-list.html";
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
            window.location.href = "chat-list.html";
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
    // Generate 6-8 characters to ensure total length is 10-12 (within constraint limits)
    const length = Math.floor(Math.random() * 3) + 6; // 6, 7, or 8 characters
    for (let i = 0; i < length; i++) {
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
// Direct Messaging Functions
// ----------------------

// Load user conversations
async function loadConversations() {
    if (!currentUser) return;

    try {
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Get user details and last messages separately
        if (conversations && conversations.length > 0) {
            for (let conv of conversations) {
                // Get other user details
                const otherUserId = conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id;
                const { data: otherUser } = await supabase
                    .from('users')
                    .select('username, name, profile_picture_url')
                    .eq('id', otherUserId)
                    .single();

                if (otherUser) {
                    conv.otherUser = otherUser;
                }

                // Get last message if exists
                if (conv.last_message_id) {
                    const { data: lastMessage } = await supabase
                        .from('messages')
                        .select('content, created_at')
                        .eq('id', conv.last_message_id)
                        .single();

                    if (lastMessage) {
                        conv.last_message = lastMessage;
                    }
                }
            }
        }

        displayConversations(conversations || []);
    } catch (error) {
        console.error('Error loading conversations:', error);
        displayConversations([]);
    }
}

// Display conversations in chat list
function displayConversations(conversations) {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;

    contactsList.innerHTML = '';

    if (conversations.length === 0) {
        contactsList.innerHTML = `
            <div class="no-chats-placeholder">
                <div class="placeholder-content">
                    <i class="fas fa-comments placeholder-icon"></i>
                    <h3>No chats yet</h3>
                    <p>Start a conversation by adding a contact</p>
                    <button class="start-chat-btn" onclick="showAddContactModal()">
                        <i class="fas fa-plus"></i> Start New Chat
                    </button>
                </div>
            </div>
        `;
        return;
    }

    conversations.forEach(conversation => {
        const otherUser = conversation.otherUser;
        if (!otherUser) return;

        const lastMessage = conversation.last_message?.content || 'No messages yet';
        const timestamp = conversation.last_message?.created_at ? 
            new Date(conversation.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.onclick = () => openDirectChat({
            id: conversation.user1_id === currentUser.id ? conversation.user2_id : conversation.user1_id,
            name: otherUser.name,
            username: otherUser.username,
            profile_picture_url: otherUser.profile_picture_url
        });

        chatItem.innerHTML = `
            <div class="contact-avatar">
                ${otherUser.profile_picture_url ? 
                    `<img src="${otherUser.profile_picture_url}" alt="${otherUser.name}">` :
                    `<div class="avatar-placeholder">${otherUser.name.charAt(0).toUpperCase()}</div>`
                }
            </div>
            <div class="chat-content">
                <div class="chat-header">
                    <h4>${otherUser.name}</h4>
                    <span class="chat-time">${timestamp}</span>
                </div>
                <p class="last-message">${lastMessage}</p>
            </div>
        `;

        contactsList.appendChild(chatItem);
    });
}

// Open direct chat with a user
async function openDirectChat(user) {
    currentConversation = user;

    // Redirect to chat.html if on chat-list.html
    if (window.location.pathname.includes("chat-list.html")) {
        localStorage.setItem('selectedContact', JSON.stringify(user));
        window.location.href = "chat.html";
        return;
    }

    // Update chat header
    document.getElementById('currentChatUser').textContent = user.name;
    document.getElementById('contactStatus').textContent = `@${user.username} • Online`;

    // Update avatar
    const avatarElement = document.getElementById('currentChatAvatar');
    if (user.profile_picture_url) {
        avatarElement.innerHTML = `<img src="${user.profile_picture_url}" alt="${user.name}">`;
    } else {
        avatarElement.innerHTML = user.name.charAt(0).toUpperCase();
    }

    // Enable message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = `Message ${user.name}...`;
    }

    const sendButton = document.getElementById('sendButton');
    if (sendButton) {
        sendButton.disabled = false;
    }

    // Hide welcome screen
    const welcomeScreen = document.querySelector('.welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    // Load messages for this conversation
    await loadMessages(user.id);

    // Start polling for new messages
    if (messagesInterval) clearInterval(messagesInterval);
    messagesInterval = setInterval(() => loadMessages(user.id), 3000);
}

// Load messages between current user and selected user
async function loadMessages(otherUserId) {
    if (!currentUser) return;

    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Get sender details for each message
        if (messages && messages.length > 0) {
            for (let message of messages) {
                const { data: sender } = await supabase
                    .from('users')
                    .select('username, name, profile_picture_url')
                    .eq('id', message.sender_id)
                    .single();

                if (sender) {
                    message.sender = sender;
                }
            }
        }

        displayMessages(messages || []);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Display messages in chat
function displayMessages(messages) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    messages.forEach(message => {
        const isSent = message.sender_id === currentUser.id;
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isSent ? 'sent' : 'received'}`;

        const timestamp = new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        let messageContent = '';
        if (message.message_type === 'image' && message.media_url) {
            messageContent = `
                <div class="media-message">
                    <img src="${message.media_url}" alt="Shared image" style="max-width: 250px; border-radius: 8px; cursor: pointer;" onclick="openImageModal('${message.media_url}')">
                    <p class="media-caption">${message.content}</p>
                </div>
            `;
        } else if (message.message_type === 'video' && message.media_url) {
            messageContent = `
                <div class="media-message">
                    <video src="${message.media_url}" controls style="max-width: 250px; border-radius: 8px;">
                        Your browser does not support video playback.
                    </video>
                    <p class="media-caption">${message.content}</p>
                </div>
            `;
        } else {
            messageContent = `<p>${message.content}</p>`;
        }

        messageElement.innerHTML = `
            <div class="message-content">
                ${!isSent && message.sender ? `
                    <div class="message-avatar">
                        ${message.sender.profile_picture_url ? 
                            `<img src="${message.sender.profile_picture_url}" alt="${message.sender.name}">` :
                            `<div class="avatar-placeholder-small">${message.sender.name.charAt(0).toUpperCase()}</div>`
                        }
                    </div>
                ` : ''}
                <div class="message-bubble">
                    ${messageContent}
                    <span class="message-time">${timestamp}</span>
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send a message
async function sendDirectMessage() {
    if (!currentConversation || !currentUser) return;

    const messageInput = document.getElementById('messageInput');
    if (!messageInput || !messageInput.value.trim()) return;

    const messageContent = messageInput.value.trim();
    messageInput.value = '';

    try {
        // Send message to database
        const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .insert({
                sender_id: currentUser.id,
                receiver_id: currentConversation.id,
                content: messageContent,
                message_type: 'text'
            })
            .select()
            .single();

        if (messageError) throw messageError;

        // Update or create conversation
        const { error: conversationError } = await supabase
            .from('conversations')
            .upsert({
                user1_id: currentUser.id < currentConversation.id ? currentUser.id : currentConversation.id,
                user2_id: currentUser.id < currentConversation.id ? currentConversation.id : currentUser.id,
                last_message_id: messageData.id,
                updated_at: new Date().toISOString()
            });

        if (conversationError) throw conversationError;

        // Reload messages to show the new one
        await loadMessages(currentConversation.id);

    } catch (error) {
        console.error('Error sending message:', error);
        showErrorMessage('Failed to send message. Please try again.');
    }
}

// Enhanced search users by email or username with better error handling
async function searchUsersByEmail(emailOrUsername) {
    try {
        const searchTerm = emailOrUsername.trim();
        console.log('Searching for user:', searchTerm);

        // First ensure current user is synced to database
        const syncSuccess = await syncUserToSupabase();
        if (!syncSuccess) {
            console.warn('User sync failed, but continuing with search');
        }

        // Check if it's an email format
        const isEmail = searchTerm.includes('@');
        
        if (isEmail) {
            // Search by email (case-insensitive)
            const { data: users, error } = await supabase
                .from('users')
                .select('id, username, name, profile_picture_url, email')
                .ilike('email', searchTerm.toLowerCase())
                .limit(1);

            if (error) {
                console.error('Email search error:', error);
                return null;
            }

            return users && users.length > 0 ? users[0] : null;
        } else {
            // Search by username - handle both with and without ZAO- prefix
            let usernameToSearch = searchTerm.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            if (!usernameToSearch.startsWith('ZAO-')) {
                usernameToSearch = `ZAO-${usernameToSearch}`;
            }

            // Validate username format before searching
            const usernameWithoutPrefix = usernameToSearch.replace('ZAO-', '');
            if (usernameWithoutPrefix.length < 3 || usernameWithoutPrefix.length > 15) {
                console.log('Invalid username format');
                return null;
            }

            // Search for exact username match first, then partial
            const { data: users, error } = await supabase
                .from('users')
                .select('id, username, name, profile_picture_url, email')
                .eq('username', usernameToSearch)
                .limit(1);

            if (error) {
                console.error('Username search error:', error);
                return null;
            }

            // If exact match found, return it
            if (users && users.length > 0) {
                return users[0];
            }

            // Try partial match if no exact match
            const { data: partialUsers, error: partialError } = await supabase
                .from('users')
                .select('id, username, name, profile_picture_url, email')
                .ilike('username', `%${usernameWithoutPrefix}%`)
                .limit(1);

            if (partialError) {
                console.error('Partial username search error:', partialError);
                return null;
            }

            return partialUsers && partialUsers.length > 0 ? partialUsers[0] : null;
        }
    } catch (error) {
        console.error('Error searching users:', error);
        return null;
    }
}

// ----------------------
// Group Chat Functions
// ----------------------

// Create a new group
async function createGroup(groupName, description = '') {
    if (!currentUser) return null;

    try {
        const { data: group, error } = await supabase
            .from('groups')
            .insert({
                name: groupName,
                description: description,
                created_by: currentUser.id,
                invite_code: generateGroupInviteCode()
            })
            .select()
            .single();

        if (error) throw error;

        // Add creator as admin
        await addUserToGroup(group.id, currentUser.id, 'admin');

        return group;
    } catch (error) {
        console.error('Error creating group:', error);
        return null;
    }
}

// Generate group invite code
function generateGroupInviteCode() {
    return 'GRP-' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

// Add user to group
async function addUserToGroup(groupId, userId, role = 'member') {
    try {
        const { error } = await supabase
            .from('group_members')
            .insert({
                group_id: groupId,
                user_id: userId,
                role: role
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error adding user to group:', error);
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
    if (currentConversation) {
        sendDirectMessage();
    } else {
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
}

// Sync user data to Supabase
async function syncUserToSupabase() {
    if (!currentUser) {
        console.error('No current user to sync');
        return false;
    }

    try {
        console.log('Syncing user to Supabase:', currentUser);

        let username = localStorage.getItem('userUsername') || '';
        const bio = localStorage.getItem('userBio') || '';
        const profilePicture = localStorage.getItem('profilePicture') || '';

        // Generate username if not exists
        if (!username) {
            username = generateRandomUsername();
            localStorage.setItem('userUsername', username);
        }

        // Ensure username starts with ZAO- and is valid
        if (!username.startsWith('ZAO-')) {
            username = `ZAO-${username.replace(/[^A-Z0-9]/g, '')}`;
        }

        // Validate username format - ensure it meets database constraints
        const usernameWithoutPrefix = username.replace('ZAO-', '');
        if (usernameWithoutPrefix.length < 4 || usernameWithoutPrefix.length > 12 || !/^[A-Z0-9]+$/.test(usernameWithoutPrefix)) {
            username = generateRandomUsername();
        }

        localStorage.setItem('userUsername', username);

        // Check if user exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id, username, name, email')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing user:', checkError);
            // Continue with insert instead of throwing error
        }

        // Prepare user data with proper validation
        const userData = {
            id: currentUser.id,
            email: currentUser.email.toLowerCase(),
            username: username,
            name: currentUser.name || currentUser.email.split('@')[0],
            profile_picture_url: profilePicture || null,
            bio: bio || '',
            updated_at: new Date().toISOString()
        };

        if (existingUser) {
            // Update existing user
            console.log('Updating existing user');
            const { error } = await supabase
                .from('users')
                .update({
                    email: userData.email,
                    username: userData.username,
                    name: userData.name,
                    profile_picture_url: userData.profile_picture_url,
                    bio: userData.bio,
                    updated_at: userData.updated_at
                })
                .eq('id', currentUser.id);

            if (error) {
                console.error('Error updating user:', error);
                // Try to fix username conflict
                if (error.code === '23505' && error.message.includes('username')) {
                    userData.username = generateRandomUsername();
                    localStorage.setItem('userUsername', userData.username);
                    return await syncUserToSupabase(); // Retry with new username
                }
                // Don't throw error, return false instead
                return false;
            } else {
                console.log('User updated successfully');
                return true;
            }
        } else {
            // Insert new user
            console.log('Inserting new user');
            userData.created_at = new Date().toISOString();
            
            const { error } = await supabase
                .from('users')
                .insert(userData);

            if (error) {
                console.error('Error inserting user:', error);
                // Try to fix username conflict
                if (error.code === '23505' && error.message.includes('username')) {
                    userData.username = generateRandomUsername();
                    localStorage.setItem('userUsername', userData.username);
                    const { error: retryError } = await supabase
                        .from('users')
                        .insert({ ...userData, username: userData.username });
                    
                    if (retryError) {
                        console.error('Retry insert failed:', retryError);
                        return false;
                    } else {
                        console.log('User inserted successfully after retry');
                        return true;
                    }
                } else {
                    // Don't throw error, return false instead
                    return false;
                }
            } else {
                console.log('User inserted successfully');
                return true;
            }
        }
    } catch (error) {
        console.error('Error syncing user to Supabase:', error);
        return false; // Return false instead of throwing
    }
}

// Enhanced contact functions
function showEmailInput() {
    const emailSection = document.getElementById('emailInputSection');
    if (emailSection) {
        emailSection.classList.remove('hidden');
    }
    const usernameSection = document.getElementById('usernameInputSection');
    if (usernameSection) {
        usernameSection.classList.add('hidden');
    }
    const optionsSection = document.querySelector('.add-contact-options-enhanced');
    if (optionsSection) {
        optionsSection.style.display = 'none';
    }
}

function showUsernameInput() {
    const usernameSection = document.getElementById('usernameInputSection');
    if (usernameSection) {
        usernameSection.classList.remove('hidden');
    }
    const emailSection = document.getElementById('emailInputSection');
    if (emailSection) {
        emailSection.classList.add('hidden');
    }
    const optionsSection = document.querySelector('.add-contact-options-enhanced');
    if (optionsSection) {
        optionsSection.style.display = 'none';
    }
}

function hideEmailInput() {
    const emailSection = document.getElementById('emailInputSection');
    if (emailSection) {
        emailSection.classList.add('hidden');
    }
    const optionsSection = document.querySelector('.add-contact-options-enhanced');
    if (optionsSection) {
        optionsSection.style.display = 'flex';
    }
}

function hideUsernameInput() {
    const usernameSection = document.getElementById('usernameInputSection');
    if (usernameSection) {
        usernameSection.classList.add('hidden');
    }
    const optionsSection = document.querySelector('.add-contact-options-enhanced');
    if (optionsSection) {
        optionsSection.style.display = 'flex';
    }
}

function requestPhoneContacts() {
    if (typeof window.showMessage === 'function') {
        window.showMessage('Phone contacts import coming soon!', 'info');
    } else {
        alert('Phone contacts import coming soon!');
    }
}

// Enhanced add contact functions
async function addContactByEmailOrUsername(emailOrUsername) {
    try {
        // Show loading state
        const addButton = document.querySelector('.btn-primary-enhanced');
        if (addButton) {
            const originalContent = addButton.innerHTML;
            addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Searching...</span>';
            addButton.disabled = true;
        }

        // Ensure current user is synced first with retry mechanism
        let syncSuccess = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!syncSuccess && retryCount < maxRetries) {
            try {
                syncSuccess = await syncUserToSupabase();
                if (!syncSuccess) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                        console.log(`Retrying user sync... Attempt ${retryCount + 1}`);
                    }
                }
            } catch (syncError) {
                console.error('Sync error:', syncError);
                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        if (!syncSuccess) {
            const errorMsg = 'Unable to sync user data after multiple attempts. Please check your internet connection and try again.';
            if (typeof window.showMessage === 'function') {
                window.showMessage(errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
            return;
        }

        // Wait a moment for sync to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        const user = await searchUsersByEmail(emailOrUsername);

        if (!user) {
            if (typeof window.showMessage === 'function') {
                window.showMessage('User not found. Please check the email address or username. Make sure the user has signed up for ZAO APP.', 'error');
            } else {
                alert('User not found. Please check the email address or username.');
            }
            return;
        }

        if (user.id === currentUser.id) {
            if (typeof window.showMessage === 'function') {
                window.showMessage('You cannot add yourself as a contact.', 'error');
            } else {
                alert('You cannot add yourself as a contact.');
            }
            return;
        }

        // Start direct chat with found user
        await openDirectChat(user);

        if (typeof window.showMessage === 'function') {
            window.showMessage(`Started chat with ${user.name}! (@${user.username})`, 'success');
        } else {
            alert(`Started chat with ${user.name}!`);
        }

        closeModal('addContactModal');

        // Clear inputs
        const emailInput = document.getElementById('contactEmail');
        const usernameInput = document.getElementById('contactUsername');
        if (emailInput) emailInput.value = '';
        if (usernameInput) usernameInput.value = '';

        // Switch to chat view on mobile
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.chat-sidebar');
            const conversation = document.querySelector('.chat-conversation');
            if (sidebar && conversation) {
                sidebar.style.display = 'none';
                conversation.style.display = 'flex';
            }
        }

    } catch (error) {
        console.error('Error adding contact:', error);
        const errorMsg = error.message || 'Failed to add contact. Please try again.';
        if (typeof window.showMessage === 'function') {
            window.showMessage(errorMsg, 'error');
        } else {
            alert(errorMsg);
        }
    } finally {
        // Reset button state
        const addButton = document.querySelector('.btn-primary-enhanced');
        if (addButton) {
            addButton.innerHTML = '<div class="btn-glow-enhanced"></div><i class="fas fa-plus"></i><span>Add Contact</span>';
            addButton.disabled = false;
        }
    }
}

async function addContactByEmail() {
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

    await addContactByEmailOrUsername(email);
}

async function addContactByUsername() {
    const usernameInput = document.getElementById('contactUsername');
    if (!usernameInput) return;

    let username = usernameInput.value.trim();
    if (!username) {
        if (typeof window.showMessage === 'function') {
            window.showMessage('Please enter a username', 'error');
        } else {
            alert('Please enter a username');
        }
        return;
    }

    // Add ZAO- prefix if not present
    if (!username.startsWith('ZAO-')) {
        username = `ZAO-${username}`;
    }

    await addContactByEmailOrUsername(username);
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

// Image modal function
function openImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <img src="${imageUrl}" style="max-width: 90%; max-height: 90%; border-radius: 8px;">
        <button style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; padding: 8px 12px; border-radius: 50%; cursor: pointer;" onclick="this.parentElement.remove()">×</button>
    `;
    
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
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
window.showUsernameInput = showUsernameInput;
window.hideEmailInput = hideEmailInput;
window.hideUsernameInput = hideUsernameInput;
window.requestPhoneContacts = requestPhoneContacts;
window.addContactByEmail = addContactByEmail;
window.addContactByUsername = addContactByUsername;
window.toggleEmojiPicker = toggleEmojiPicker;
window.insertEmoji = insertEmoji;
window.openMediaSelector = openMediaSelector;
window.loadConversations = loadConversations;
window.openDirectChat = openDirectChat;
window.syncUserToSupabase = syncUserToSupabase;
window.openImageModal = openImageModal;
window.currentUser = currentUser;
window.currentConversation = currentConversation;
window.uploadMedia = uploadMedia;
window.loadMessages = loadMessages;

// Export for other modules
export { currentUser, uploadMedia, supabase, logout };
