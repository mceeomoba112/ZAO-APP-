// ===== ZAO APP - app.js =====

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBZOir1TzbFlMDw2q9lQyACRLp19UTZKC4",
  authDomain: "zao-app-ca76f.firebaseapp.com",
  projectId: "zao-app-ca76f",
  storageBucket: "zao-app-ca76f.appspot.com",
  messagingSenderId: "42789375098",
  appId: "1:42789375098:web:c217ff5241997672a63fc3"
};
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();

// Supabase Configuration
const SUPABASE_URL = "https://crmyrtgyxbmkhlzctapu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNybXlydGd5eGJta2hsemN0YXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTEwODcsImV4cCI6MjA3MTA4NzA4N30.bbj-zsXgJU-FBMCTs_WLfk0JYiydkhmr--O2b9Iiqbc";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentChatUser = null;

// ===== AUTH =====
async function signup(name, email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);
  currentUser = { id: data.user.id, name, email };
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  alert("Signup successful! Login now.");
  window.location.href = "index.html";
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);
  currentUser = { id: data.user.id, email };
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  alert("Login successful!");
  window.location.href = "chat.html";
}

// ===== CONTACTS =====
async function loadContacts() {
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("*")
    .or(`user1.eq.${currentUser.id},user2.eq.${currentUser.id}`);
  if (error) return alert(error.message);
  const contactsList = document.getElementById("contactsList");
  contactsList.innerHTML = "";
  contacts.forEach(contact => {
    const contactId = contact.user1 === currentUser.id ? contact.user2 : contact.user1;
    const div = document.createElement("div");
    div.className = "contact-item";
    div.textContent = contact.name || "Contact";
    div.onclick = () => selectContact(contactId, contact.name);
    contactsList.appendChild(div);
  });
}

// ===== CHAT =====
function selectContact(contactId, name) {
  currentChatUser = { id: contactId, name };
  document.getElementById("currentChatUser").textContent = name;
  document.getElementById("messageInput").disabled = false;
  document.getElementById("sendButton").disabled = false;
  loadMessages(contactId);
}

async function loadMessages(contactId) {
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${contactId}`)
    .order("created_at", { ascending: true });
  if (error) return alert(error.message);
  const container = document.getElementById("messagesContainer");
  container.innerHTML = "";
  messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = "message " + (msg.sender_id === currentUser.id ? "sent" : "received");
    if (msg.type === "text") div.innerHTML = `<div class="message-bubble">${msg.content}<div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div></div>`;
    if (msg.type === "image") div.innerHTML = `<div class="message-bubble"><img src="${msg.content}" width="150"><div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div></div>`;
    if (msg.type === "video") div.innerHTML = `<div class="message-bubble"><video src="${msg.content}" width="150" controls></video><div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div></div>`;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text || !currentChatUser) return;
  input.value = "";
  await supabase.from("messages").insert([{ sender_id: currentUser.id, receiver_id: currentChatUser.id, content: text, type: "text" }]);
  loadMessages(currentChatUser.id);
}

async function sendMedia(file) {
  if (!file || !currentChatUser) return;
  const fileRef = storage.ref().child(`chat/${Date.now()}_${file.name}`);
  const snapshot = await fileRef.put(file);
  const url = await snapshot.ref.getDownloadURL();
  const type = file.type.startsWith("image/") ? "image" : "video";
  await supabase.from("messages").insert([{ sender_id: currentUser.id, receiver_id: currentChatUser.id, content: url, type }]);
  loadMessages(currentChatUser.id);
}

// ===== ONLINE PRESENCE =====
async function setOnlineStatus() {
  await supabase.from("presence").upsert({ user_id: currentUser.id, online: true });
  window.addEventListener("beforeunload", async () => {
    await supabase.from("presence").upsert({ user_id: currentUser.id, online: false });
  });
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  const storedUser = localStorage.getItem("currentUser");
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    loadContacts();
    setOnlineStatus();
  }
});