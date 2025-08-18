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
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // Save name to profiles table
        const { error: profileError } = await supabase.from('profiles').insert([
            { id: data.user.id, name: name, email: email }
        ]);
        if (profileError) throw profileError;

        alert("Signup successful! Please login.");
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

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select("*")
            .eq("id", data.user.id)
            .single();
        if (profileError) throw profileError;

        currentUser = { id: data.user.id, name: profile.name, email: profile.email };
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        window.location.href = "chat.html";
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
    await supabase.from('profiles').update({ is_online: isOnline }).eq('id', currentUser.id);
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

// Export for chat.js if needed
export { currentUser, uploadMedia, supabase, logout };
