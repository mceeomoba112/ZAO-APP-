import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

let currentUser = null;

// Initialize settings page
document.addEventListener('DOMContentLoaded', () => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
        window.location.href = "index.html";
        return;
    }

    currentUser = JSON.parse(storedUser);
    loadUserSettings();
    loadUserPreferences();
});

// Load user settings
function loadUserSettings() {
    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profileEmail').textContent = currentUser.email || '';

    // Load username
    const username = localStorage.getItem('userUsername');
    if (username) {
        document.getElementById('profileUsername').value = username;
    }

    // Load profile picture if exists
    const profilePicture = localStorage.getItem('profilePicture');
    if (profilePicture) {
        document.getElementById('profilePreview').src = profilePicture;
        document.getElementById('profilePreview').style.display = 'block';
        document.getElementById('defaultAvatar').style.display = 'none';
    }

    // Load bio
    const bio = localStorage.getItem('userBio');
    if (bio) {
        document.getElementById('profileBio').value = bio;
    }

    // Check email verification status
    checkEmailVerification();
}

// Load user preferences
function loadUserPreferences() {
    const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');

    document.getElementById('darkModeToggle').checked = preferences.darkMode || false;
    document.getElementById('savePhotosToggle').checked = preferences.savePhotos || false;
    document.getElementById('readReceiptsToggle').checked = preferences.readReceipts !== false;
    document.getElementById('messageNotificationsToggle').checked = preferences.messageNotifications !== false;
    document.getElementById('soundNotificationsToggle').checked = preferences.soundNotifications !== false;
    

    // Apply dark mode if enabled
    if (preferences.darkMode) {
        document.body.classList.add('dark-mode');
    }
}

// Toggle section visibility
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const header = section.previousElementSibling;
    const icon = header.querySelector('.toggle-icon');

    section.classList.toggle('expanded');
    icon.classList.toggle('rotated');
}

// Profile picture handling
document.getElementById('profilePicInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            // Upload to Firebase Storage
            const storageRef = ref(storage, `profile-pictures/${currentUser.id}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Display preview
            document.getElementById('profilePreview').src = downloadURL;
            document.getElementById('profilePreview').style.display = 'block';
            document.getElementById('defaultAvatar').style.display = 'none';

            // Store locally for immediate use
            localStorage.setItem('profilePicture', downloadURL);

            showNotification('Profile picture uploaded successfully!', 'success');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            showNotification('Failed to upload profile picture', 'error');
        }
    }
});

// Remove profile picture
function removeProfilePicture() {
    document.getElementById('profilePreview').style.display = 'none';
    document.getElementById('defaultAvatar').style.display = 'flex';
    localStorage.removeItem('profilePicture');
    showNotification('Profile picture removed', 'success');
}

// Save profile changes
function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const username = document.getElementById('profileUsername').value.trim();
    const bio = document.getElementById('profileBio').value.trim();

    // Validation - Username is now mandatory
    if (!name) {
        showNotification('Name is required', 'error');
        return;
    }

    if (!username) {
        showNotification('Username is required and mandatory for all users', 'error');
        return;
    }

    if (!username.startsWith('ZAO-')) {
        showNotification('Username must start with "ZAO-"', 'error');
        return;
    }

    if (username.length < 8 || username.length > 16) {
        showNotification('Username must be 8-16 characters including "ZAO-" prefix', 'error');
        return;
    }

    if (!bio) {
        showNotification('Bio is required to complete your profile', 'error');
        return;
    }

    // Validate username pattern
    const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernamePattern.test(username)) {
        showNotification('Username must be 3-20 characters (letters, numbers, underscore only)', 'error');
        return;
    }

    // Update current user
    currentUser.name = name;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Save username and bio
    localStorage.setItem('userUsername', username);
    localStorage.setItem('userBio', bio);

    showNotification('Profile updated successfully!', 'success');

    // Check if profile is now complete and redirect to chat if needed
    setTimeout(() => {
        if (isProfileComplete()) {
            window.location.href = 'chat.html';
        }
    }, 1500);
}

// Change password
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('All password fields are required', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('New password must be at least 6 characters', 'error');
        return;
    }

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        showNotification('Password changed successfully!', 'success');
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Failed to change password: ' + error.message, 'error');
    }
}

// Check email verification
async function checkEmailVerification() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const verificationStatus = document.getElementById('verificationStatus');
        const verifyBtn = document.getElementById('verifyEmailBtn');

        if (user && user.email_confirmed_at) {
            verificationStatus.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
            verificationStatus.className = 'verification-status verified';
            verifyBtn.style.display = 'none';
        } else {
            verificationStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Unverified';
            verificationStatus.className = 'verification-status unverified';
            verifyBtn.style.display = 'block';
        }
    } catch (error) {
        console.error('Error checking verification:', error);
    }
}

// Send verification email
async function sendVerificationEmail() {
    try {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: currentUser.email
        });

        if (error) throw error;

        showNotification('Verification email sent! Check your inbox.', 'success');
    } catch (error) {
        console.error('Error sending verification:', error);
        showNotification('Failed to send verification email', 'error');
    }
}

// Chat background handling
document.getElementById('backgroundInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            localStorage.setItem('chatBackground', e.target.result);
            showNotification('Chat background updated!', 'success');
        };
        reader.readAsDataURL(file);
    }
});

// Save preferences when toggles change
document.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
    toggle.addEventListener('change', () => {
        saveUserPreferences();

        // Handle dark mode toggle
        if (toggle.id === 'darkModeToggle') {
            document.body.classList.toggle('dark-mode', toggle.checked);
        }
    });
});

// Save user preferences
function saveUserPreferences() {
    const preferences = {
        darkMode: document.getElementById('darkModeToggle').checked,
        savePhotos: document.getElementById('savePhotosToggle').checked,
        readReceipts: document.getElementById('readReceiptsToggle').checked,
        messageNotifications: document.getElementById('messageNotificationsToggle').checked,
        soundNotifications: document.getElementById('soundNotificationsToggle').checked,
        
    };

    localStorage.setItem('userPreferences', JSON.stringify(preferences));
}

// Invite functions
function inviteByEmail() {
    document.getElementById('emailInviteModal').classList.remove('hidden');
}

function sendEmailInvite() {
    const email = document.getElementById('inviteEmail').value.trim();
    if (!email) {
        showNotification('Please enter an email address', 'error');
        return;
    }

    // Simulate sending invite
    const inviteLink = `${window.location.origin}/index.html?invite=${currentUser.id}`;

    // In a real app, you would send this via email service
    navigator.clipboard.writeText(`Join me on ZAO APP: ${inviteLink}`).then(() => {
        showNotification('Invite link copied to clipboard!', 'success');
        closeModal('emailInviteModal');
        document.getElementById('inviteEmail').value = '';
    });
}

function shareInviteLink() {
    const inviteLink = `${window.location.origin}/index.html?invite=${currentUser.id}`;

    if (navigator.share) {
        navigator.share({
            title: 'Join me on ZAO APP',
            text: 'Join me on ZAO APP for secure messaging',
            url: inviteLink
        });
    } else {
        navigator.clipboard.writeText(inviteLink).then(() => {
            showNotification('Invite link copied to clipboard!', 'success');
        });
    }
}

function showQRCode() {
    const inviteLink = `${window.location.origin}/index.html?invite=${currentUser.id}`;
    const qrContainer = document.getElementById('qrCodeContainer');

    // Simple QR code placeholder - in production, use a QR code library
    qrContainer.innerHTML = `
        <div class="qr-placeholder">
            <i class="fas fa-qrcode" style="font-size: 120px; color: #667eea;"></i>
            <p style="margin-top: 10px; font-size: 12px; word-break: break-all;">${inviteLink}</p>
        </div>
    `;

    document.getElementById('qrModal').classList.remove('hidden');
}

// Modal functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Navigation
function goBackToChat() {
    window.location.href = 'chat.html';
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;

    if (type === 'success') notification.style.background = '#28a745';
    else if (type === 'error') notification.style.background = '#dc3545';
    else notification.style.background = '#007bff';

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Profile completion check
function isProfileComplete() {
    const storedUser = localStorage.getItem('currentUser');
    const username = localStorage.getItem('userUsername');
    const bio = localStorage.getItem('userBio');

    if (!storedUser) return false;

    const user = JSON.parse(storedUser);

    // Check if required fields are complete
    return user.name && 
           user.name.trim() !== '' && 
           username && 
           username.trim() !== '' &&
           bio && 
           bio.trim() !== '';
}

// Make functions globally available
window.toggleSection = toggleSection;
window.removeProfilePicture = removeProfilePicture;
window.saveProfile = saveProfile;
window.changePassword = changePassword;
window.sendVerificationEmail = sendVerificationEmail;
window.inviteByEmail = inviteByEmail;
window.sendEmailInvite = sendEmailInvite;
window.shareInviteLink = shareInviteLink;
window.showQRCode = showQRCode;
window.closeModal = closeModal;
window.goBackToChat = goBackToChat;

// Settings page specific functions - removed duplicates and Face ID
function confirmLogout() {
    if (confirm('Are you sure you want to logout?')) {
        logout();
    }
}

function logout() {
    // Clear user data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userUsername');
    localStorage.removeItem('userBio');
    localStorage.removeItem('profilePicture');
    localStorage.removeItem('userPreferences');
    localStorage.removeItem('userContacts');
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('recentSearches');
    
    // Redirect to login page
    window.location.href = 'index.html';
}

function exportUserData() {
    const userData = {
        user: JSON.parse(localStorage.getItem('currentUser') || '{}'),
        username: localStorage.getItem('userUsername'),
        bio: localStorage.getItem('userBio'),
        preferences: JSON.parse(localStorage.getItem('userPreferences') || '{}'),
        contacts: JSON.parse(localStorage.getItem('userContacts') || '[]'),
        messages: JSON.parse(localStorage.getItem('chatMessages') || '{}')
    };

    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zao-app-data.json';
    link.click();
    
    URL.revokeObjectURL(url);
    alert('Your data has been exported successfully!');
}

function confirmDeleteAccount() {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation === 'DELETE') {
        if (confirm('This action cannot be undone. Are you absolutely sure?')) {
            deleteAccount();
        }
    } else if (confirmation !== null) {
        alert('Account deletion cancelled. Please type "DELETE" exactly.');
    }
}

function deleteAccount() {
    // Clear all user data
    localStorage.clear();
    
    // In a real app, you would also delete from the backend database
    alert('Your account has been deleted. You will now be redirected to the login page.');
    window.location.href = 'index.html';
}

// Make functions globally available
window.confirmLogout = confirmLogout;
window.logout = logout;
window.exportUserData = exportUserData;
window.confirmDeleteAccount = confirmDeleteAccount;
window.deleteAccount = deleteAccount;
