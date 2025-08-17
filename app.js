
// ZAO APP - Frontend JavaScript
// Configuration
const CONFIG = {
    // Replace with your actual backend URL when deployed
    API_BASE_URL: 'http://0.0.0.0:5000/api',
    SUPABASE_URL: 'https://wkwhzdpgsdtjvalbkjea.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrd2h6ZHBnc2R0anZhbGJramVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NTczMzUsImV4cCI6MjA3MTAzMzMzNX0.6rLdDr7WPBWTnNhhfW09uNAtyWIiLcX_kgHVR-eP4Ko'
};

// Global variables
let currentUser = null;
let currentChatUser = null;
let supabaseClient = null;
let messagesSubscription = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        // Redirect to chat if on login page
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            window.location.href = 'chat.html';
            return;
        }
        // Initialize chat if on chat page
        if (window.location.pathname.includes('chat.html')) {
            initializeChat();
        }
        // Initialize contacts if on contacts page
        if (window.location.pathname.includes('contacts.html')) {
            initializeContacts();
        }
    } else {
        // Redirect to login if not authenticated and not on login page
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
            return;
        }
        // Initialize auth forms
        initializeAuth();
    }
}

// Initialize authentication
function initializeAuth() {
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        showLoading('Logging in...');
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store auth data
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            currentUser = data.user;
            
            // Redirect to chat
            window.location.href = 'chat.html';
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

// Handle signup
async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        showLoading('Creating account...');
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Account created successfully! Please login.');
            switchToLogin();
        } else {
            showError(data.error || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

// Initialize chat page
function initializeChat() {
    // Set user name
    const userNameElement = document.getElementById('userName');
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.name;
    }
    
    // Load contacts
    loadContacts();
    
    // Initialize message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Initialize real-time updates
    initializeRealtime();
}

// Load contacts
async function loadContacts() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${CONFIG.API_BASE_URL}/contacts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayContacts(data.contacts);
        } else {
            console.error('Failed to load contacts:', data.error);
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

// Display contacts in sidebar
function displayContacts(contacts) {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;
    
    contactsList.innerHTML = '';
    
    contacts.forEach(contact => {
        const contactElement = document.createElement('div');
        contactElement.className = 'contact-item';
        contactElement.onclick = () => selectContact(contact);
        
        contactElement.innerHTML = `
            <div class="contact-name">${contact.name}</div>
            <div class="contact-last-message">${contact.lastMessage || 'No messages yet'}</div>
        `;
        
        contactsList.appendChild(contactElement);
    });
}

// Select a contact to chat with
function selectContact(contact) {
    currentChatUser = contact;
    
    // Update UI
    const currentChatUserElement = document.getElementById('currentChatUser');
    if (currentChatUserElement) {
        currentChatUserElement.textContent = contact.name;
    }
    
    // Enable message input
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    if (messageInput && sendButton) {
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.placeholder = `Message ${contact.name}...`;
    }
    
    // Highlight selected contact
    document.querySelectorAll('.contact-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.contact-item').classList.add('active');
    
    // Load messages for this contact
    loadMessages(contact.id);
}

// Load messages for selected contact
async function loadMessages(contactId) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${CONFIG.API_BASE_URL}/messages/${contactId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayMessages(data.messages);
        } else {
            console.error('Failed to load messages:', data.error);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Display messages in chat window
function displayMessages(messages) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        const isOwn = message.sender_id === currentUser.id;
        
        messageElement.className = `message ${isOwn ? 'sent' : 'received'}`;
        
        messageElement.innerHTML = `
            <div class="message-bubble">
                ${message.message_text}
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput || !currentChatUser) return;
    
    const messageText = messageInput.value.trim();
    if (!messageText) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${CONFIG.API_BASE_URL}/messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                receiver_id: currentChatUser.id,
                message_text: messageText
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Clear input
            messageInput.value = '';
            
            // Add message to UI immediately (optimistic update)
            addMessageToUI({
                id: data.message.id,
                sender_id: currentUser.id,
                message_text: messageText,
                timestamp: new Date().toISOString()
            });
        } else {
            showError(data.error || 'Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Network error. Please try again.');
    }
}

// Add message to UI
function addMessageToUI(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    const isOwn = message.sender_id === currentUser.id;
    
    messageElement.className = `message ${isOwn ? 'sent' : 'received'}`;
    
    messageElement.innerHTML = `
        <div class="message-bubble">
            ${message.message_text}
            <div class="message-time">${formatTime(message.timestamp)}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show add contact modal
function showAddContact() {
    const modal = document.getElementById('addContactModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Hide add contact modal
function hideAddContact() {
    const modal = document.getElementById('addContactModal');
    const emailInput = document.getElementById('contactEmail');
    
    if (modal) {
        modal.classList.add('hidden');
    }
    
    if (emailInput) {
        emailInput.value = '';
    }
}

// Add contact
async function addContact() {
    const emailInput = document.getElementById('contactEmail');
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    if (!email) {
        showError('Please enter an email address');
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${CONFIG.API_BASE_URL}/contacts/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Contact added successfully!');
            hideAddContact();
            loadContacts(); // Refresh contacts list
        } else {
            showError(data.error || 'Failed to add contact');
        }
    } catch (error) {
        console.error('Error adding contact:', error);
        showError('Network error. Please try again.');
    }
}

// Initialize real-time updates (placeholder for Supabase integration)
function initializeRealtime() {
    // This would be implemented with Supabase real-time subscriptions
    // For now, we'll use polling as a fallback
    setInterval(() => {
        if (currentChatUser) {
            loadMessages(currentChatUser.id);
        }
    }, 5000); // Poll every 5 seconds
}

// Initialize contacts page
function initializeContacts() {
    loadAllContacts();
}

// Load all contacts for contacts page
async function loadAllContacts() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${CONFIG.API_BASE_URL}/contacts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayContactsGrid(data.contacts);
        } else {
            console.error('Failed to load contacts:', data.error);
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

// Display contacts in grid format
function displayContactsGrid(contacts) {
    const contactsGrid = document.getElementById('contactsGrid');
    if (!contactsGrid) return;
    
    contactsGrid.innerHTML = '';
    
    contacts.forEach(contact => {
        const contactCard = document.createElement('div');
        contactCard.className = 'contact-card';
        
        contactCard.innerHTML = `
            <h3>${contact.name}</h3>
            <p>${contact.email}</p>
            <div class="contact-actions">
                <button class="chat-btn" onclick="startChat(${contact.id})">Chat</button>
                <button class="remove-btn" onclick="removeContact(${contact.id})">Remove</button>
            </div>
        `;
        
        contactsGrid.appendChild(contactCard);
    });
}

// Start chat with contact
function startChat(contactId) {
    // Store the contact ID to select when returning to chat
    localStorage.setItem('selectedContactId', contactId);
    window.location.href = 'chat.html';
}

// Remove contact
async function removeContact(contactId) {
    if (!confirm('Are you sure you want to remove this contact?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${CONFIG.API_BASE_URL}/contacts/${contactId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Contact removed successfully!');
            loadAllContacts(); // Refresh contacts list
        } else {
            showError(data.error || 'Failed to remove contact');
        }
    } catch (error) {
        console.error('Error removing contact:', error);
        showError('Network error. Please try again.');
    }
}

// Navigation functions
function goToChat() {
    window.location.href = 'chat.html';
}

function goToContacts() {
    window.location.href = 'contacts.html';
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('selectedContactId');
    window.location.href = 'index.html';
}

// Utility functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showLoading(message = 'Loading...') {
    // Create or update loading indicator
    let loading = document.getElementById('loadingIndicator');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loadingIndicator';
        loading.className = 'loading';
        document.body.appendChild(loading);
    }
    loading.textContent = message;
    loading.style.display = 'block';
}

function hideLoading() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.zIndex = '10000';
    notification.style.maxWidth = '300px';
    notification.style.wordWrap = 'break-word';
    
    if (type === 'error') {
        notification.style.background = '#f8d7da';
        notification.style.color = '#721c24';
        notification.style.border = '1px solid #f5c6cb';
    } else if (type === 'success') {
        notification.style.background = '#d4edda';
        notification.style.color = '#155724';
        notification.style.border = '1px solid #c3e6cb';
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Search functionality
function searchContacts() {
    const searchInput = document.getElementById('contactSearch');
    const contacts = document.querySelectorAll('.contact-item');
    
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    
    contacts.forEach(contact => {
        const contactName = contact.querySelector('.contact-name').textContent.toLowerCase();
        if (contactName.includes(searchTerm)) {
            contact.style.display = 'block';
        } else {
            contact.style.display = 'none';
        }
    });
}

// Add search event listener if on chat page
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('contactSearch');
    if (searchInput) {
        searchInput.addEventListener('input', searchContacts);
    }
});
