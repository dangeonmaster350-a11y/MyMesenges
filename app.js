// app.js - Основная логика мессенджера

let currentUser = null;
let currentChatId = null;
let replyToMessage = null;
let soundEnabled = true;
let synth = null;

// DOM элементы
const elements = {
    loginScreen: document.getElementById('login-screen'),
    verificationScreen: document.getElementById('verification-screen'),
    mainApp: document.getElementById('main-app'),
    phoneInput: document.getElementById('phone-input'),
    loginError: document.getElementById('login-error'),
    verificationEmail: document.getElementById('verification-email-display'),
    codeInput: document.getElementById('code-input'),
    codeError: document.getElementById('code-error'),
    chatList: document.getElementById('chat-list'),
    messagesArea: document.getElementById('messages-area'),
    chatName: document.getElementById('chat-name'),
    chatStatus: document.getElementById('chat-status'),
    chatAvatar: document.getElementById('chat-avatar'),
    messageInput: document.getElementById('message-input'),
    messageForm: document.getElementById('message-form'),
    sendBtn: document.getElementById('send-btn'),
    micBtn: document.getElementById('mic-btn'),
    attachBtn: document.getElementById('attach-btn'),
    emojiBtn: document.getElementById('emoji-btn'),
    emojiPicker: document.getElementById('emoji-picker'),
    replyPreview: document.getElementById('reply-preview'),
    replyText: document.getElementById('reply-text'),
    cancelReply: document.getElementById('cancel-reply'),
    typingIndicator: document.getElementById('typing-indicator'),
    typingName: document.getElementById('typing-name'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsPanel: document.getElementById('settings-panel'),
    backFromSettings: document.getElementById('back-from-settings'),
    darkModeCheckbox: document.getElementById('dark-mode-checkbox'),
    soundCheckbox: document.getElementById('sound-checkbox'),
    logoutBtn: document.getElementById('logout-btn'),
    menuBtn: document.getElementById('menu-btn'),
    closeSidebarBtn: document.getElementById('close-sidebar-btn'),
    chatSidebar: document.getElementById('chat-sidebar'),
    infoBtn: document.getElementById('info-btn'),
    infoSidebar: document.getElementById('info-sidebar'),
    closeInfoBtn: document.getElementById('close-info-btn'),
    infoAvatar: document.getElementById('info-avatar'),
    infoName: document.getElementById('info-name'),
    infoStatus: document.getElementById('info-status'),
    infoEmail: document.getElementById('info-email'),
    infoUsername: document.getElementById('info-username'),
    createBtn: document.getElementById('create-btn'),
    createDropdown: document.getElementById('create-dropdown'),
    searchInput: document.getElementById('search-input'),
    groupModal: document.getElementById('group-modal'),
    channelModal: document.getElementById('channel-modal')
};

// Эмодзи для пикера
const emojis = ['😀', '😂', '👍', '❤️', '😢', '🙏', '🔥', '🎉', '🤔', '👀', '👋', '💀', '✨', '⭐', '🎈', '💡'];

// Инициализация
async function init() {
    await Tone.start();
    synth = new Tone.Synth().toDestination();
    
    setupEventListeners();
    loadThemePreference();
    loadSoundPreference();
    setupEmojiPicker();
}

function setupEventListeners() {
    // Вход
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('code-form').addEventListener('submit', handleVerification);
    document.getElementById('resend-code-btn').addEventListener('click', handleResendCode);
    
    // Отправка сообщений
    elements.messageForm.addEventListener('submit', sendMessage);
    elements.messageInput.addEventListener('input', toggleSendButton);
    elements.sendBtn.addEventListener('click', () => elements.messageForm.dispatchEvent(new Event('submit')));
    elements.micBtn.addEventListener('click', sendVoiceMessage);
    elements.attachBtn.addEventListener('click', sendFileMessage);
    elements.emojiBtn.addEventListener('click', toggleEmojiPicker);
    elements.cancelReply.addEventListener('click', cancelReply);
    
    // Настройки
    elements.settingsBtn.addEventListener('click', showSettings);
    elements.backFromSettings.addEventListener('click', hideSettings);
    elements.darkModeCheckbox.addEventListener('change', toggleDarkMode);
    elements.soundCheckbox.addEventListener('change', toggleSound);
    elements.logoutBtn.addEventListener('click', logout);
    
    // Мобильное меню
    elements.menuBtn.addEventListener('click', () => elements.chatSidebar.classList.add('open'));
    elements.closeSidebarBtn.addEventListener('click', () => elements.chatSidebar.classList.remove('open'));
    
    // Инфо панель
    elements.infoBtn.addEventListener('click', () => elements.infoSidebar.classList.remove('hidden'));
    elements.closeInfoBtn.addEventListener('click', () => elements.infoSidebar.classList.add('hidden'));
    
    // Создание чатов
    elements.createBtn.addEventListener('click', () => elements.createDropdown.classList.toggle('hidden'));
    document.getElementById('new-group-action').addEventListener('click', showGroupModal);
    document.getElementById('new-channel-action').addEventListener('click', showChannelModal);
    document.getElementById('cancel-group').addEventListener('click', () => elements.groupModal.classList.add('hidden'));
    document.getElementById('create-group').addEventListener('click', createGroup);
    document.getElementById('cancel-channel').addEventListener('click', () => elements.channelModal.classList.add('hidden'));
    document.getElementById('create-channel').addEventListener('click', createChannel);
    
    // Поиск
    elements.searchInput.addEventListener('input', filterChats);
    
    // Закрытие dropdown при клике вне
    document.addEventListener('click', (e) => {
        if (!elements.createBtn.contains(e.target)) {
            elements.createDropdown.classList.add('hidden');
        }
    });
}

// Вход
async function handleLogin(e) {
    e.preventDefault();
    const phone = elements.phoneInput.value.trim();
    
    if (!phone || phone.length < 6) {
        elements.loginError.classList.remove('hidden');
        return;
    }
    
    const { code, email } = db.registerOrLogin(phone);
    console.log(`Код подтверждения: ${code}`); // Для отладки
    
    // Показываем код в алерте (имитация отправки на почту)
    alert(`📧 Код подтверждения отправлен на ${email}\n🔑 Ваш код: ${code}`);
    
    elements.verificationEmail.textContent = email;
    elements.loginScreen.classList.remove('active');
    elements.verificationScreen.classList.add('active');
    window.pendingPhone = phone;
}

function handleVerification(e) {
    e.preventDefault();
    const code = elements.codeInput.value.trim();
    
    if (db.verifyCode(window.pendingPhone, code)) {
        currentUser = window.pendingPhone;
        loadUserData();
        elements.verificationScreen.classList.remove('active');
        elements.mainApp.classList.remove('hidden');
    } else {
        elements.codeError.classList.remove('hidden');
    }
}

function handleResendCode() {
    if (window.pendingPhone) {
        const { code, email } = db.registerOrLogin(window.pendingPhone);
        alert(`📧 Новый код отправлен на ${email}\n🔑 Код: ${code}`);
        elements.codeError.classList.add('hidden');
    }
}

// Загрузка данных пользователя
function loadUserData() {
    const user = db.getUser(currentUser);
    if (user) {
        renderChatList(user.chats);
        if (user.chats.length > 0) {
            selectChat(user.chats[0].id);
        }
    }
}

// Рендер списка чатов
function renderChatList(chats) {
    elements.chatList.innerHTML = '';
    
    chats.forEach(chat => {
        const chatEl = document.createElement('div');
        chatEl.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatEl.innerHTML = `
            <div class="chat-avatar" style="background: var(--primary); border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                ${chat.isGroup ? '👥' : chat.isChannel ? '📢' : chat.isFavorites ? '⭐' : '👤'}
            </div>
            <div class="chat-details">
                <div class="chat-name">${chat.name}</div>
                <div class="chat-last-message">${chat.lastMessage || ''}</div>
            </div>
            <div class="chat-time">${chat.time || ''}</div>
        `;
        chatEl.addEventListener('click', () => selectChat(chat.id));
        elements.chatList.appendChild(chatEl);
    });
}

// Выбор чата
function selectChat(chatId) {
    currentChatId = chatId;
    const user = db.getUser(currentUser);
    const chat = user.chats.find(c => c.id === chatId);
    
    if (!chat) return;
    
    // Обновляем заголовок
    elements.chatName.textContent = chat.name;
    elements.chatStatus.textContent = chat.isGroup ? `👥 ${chat.members?.length || 3} участника` : (chat.online ? '🟢 в сети' : '⚫ не в сети');
    elements.chatAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=1A73E8&color=fff&rounded=true`;
    
    // Обновляем инфо панель
    elements.infoAvatar.src = elements.chatAvatar.src;
    elements.infoName.textContent = chat.name;
    elements.infoStatus.textContent = elements.chatStatus.textContent;
    elements.infoEmail.textContent = user.email;
    elements.infoUsername.textContent = user.username;
    
    renderMessages(chat.messages);
    renderChatList(user.chats);
    
    // На мобильных закрываем сайдбар
    if (window.innerWidth < 768) {
        elements.chatSidebar.classList.remove('open');
    }
}

// Рендер сообщений
function renderMessages(messages) {
    elements.messagesArea.innerHTML = '';
    
    messages.forEach(msg => {
        const isMe = msg.from === 'me';
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isMe ? 'outgoing' : 'incoming'}`;
        messageDiv.dataset.messageId = msg.id;
        
        let authorHtml = '';
        if (msg.author && !isMe) {
            authorHtml = `<div class="message-author">${msg.author}</div>`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${authorHtml}
                <div class="message-text">${msg.deleted ? '⚠️ Сообщение удалено' : msg.text}</div>
                <div class="message-time">${msg.time}</div>
            </div>
        `;
        
        if (!msg.deleted && !msg.from === 'system') {
            messageDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showMessageActions(msg.id, msg.text);
            });
        }
        
        elements.messagesArea.appendChild(messageDiv);
    });
    
    elements.messagesArea.scrollTop = elements.messagesArea.scrollHeight;
}

// Показать действия с сообщением
function showMessageActions(messageId, text) {
    const reply = confirm(`Ответить на сообщение?\n\n"${text}"`);
    if (reply) {
        startReply(messageId, text);
    }
}

function startReply(messageId, text) {
    replyToMessage = messageId;
    elements.replyText.textContent = text;
    elements.replyPreview.classList.remove('hidden');
    elements.messageInput.focus();
}

function cancelReply() {
    replyToMessage = null;
    elements.replyPreview.classList.add('hidden');
}

// Отправка сообщения
function sendMessage(e) {
    e.preventDefault();
    const text = elements.messageInput.value.trim();
    if (!text) return;
    
    const message = {
        id: Date.now().toString(),
        from: 'me',
        text: text,
        time: getCurrentTime(),
        type: 'text'
    };
    
    if (replyToMessage) {
        message.replyTo = replyToMessage;
        cancelReply();
    }
    
    db.addMessage(currentUser, currentChatId, message);
    playNotificationSound();
    
    const user = db.getUser(currentUser);
    const chat = user.chats.find(c => c.id === currentChatId);
    renderMessages(chat.messages);
    renderChatList(user.chats);
    
    elements.messageInput.value = '';
    toggleSendButton();
    
    // Имитация ответа
    simulateReply();
}

function sendVoiceMessage() {
    const message = {
        id: Date.now().toString(),
        from: 'me',
        text: '🎤 Голосовое сообщение',
        time: getCurrentTime(),
        type: 'voice'
    };
    db.addMessage(currentUser, currentChatId, message);
    playNotificationSound();
    
    const user = db.getUser(currentUser);
    const chat = user.chats.find(c => c.id === currentChatId);
    renderMessages(chat.messages);
    renderChatList(user.chats);
    simulateReply();
}

function sendFileMessage() {
    const message = {
        id: Date.now().toString(),
        from: 'me',
        text: '📎 Файл',
        time: getCurrentTime(),
        type: 'file'
    };
    db.addMessage(currentUser, currentChatId, message);
    playNotificationSound();
    
    const user = db.getUser(currentUser);
    const chat = user.chats.find(c => c.id === currentChatId);
    renderMessages(chat.messages);
    renderChatList(user.chats);
    simulateReply();
}

// Имитация ответа собеседника
function simulateReply() {
    elements.typingIndicator.classList.remove('hidden');
    const user = db.getUser(currentUser);
    const chat = user.chats.find(c => c.id === currentChatId);
    elements.typingName.textContent = chat.name;
    
    setTimeout(() => {
        elements.typingIndicator.classList.add('hidden');
        
        const replyTexts = ['Понял, спасибо!', 'Отлично!', '👍', 'Хорошо, учту', 'Спасибо за информацию'];
        const randomText = replyTexts[Math.floor(Math.random() * replyTexts.length)];
        
        const reply = {
            id: Date.now().toString(),
            from: 'them',
            text: randomText,
            time: getCurrentTime(),
            type: 'text',
            author: chat.isGroup ? chat.name.split(' ')[0] : null
        };
        
        db.addMessage(currentUser, currentChatId, reply);
        playNotificationSound();
        
        const updatedUser = db.getUser(currentUser);
        const updatedChat = updatedUser.chats.find(c => c.id === currentChatId);
        renderMessages(updatedChat.messages);
        renderChatList(updatedUser.chats);
    }, 2000 + Math.random() * 2000);
}

// Создание группы
function createGroup() {
    const name = document.getElementById('group-name').value.trim();
    if (!name) return;
    
    const newChat = {
        id: `group_${Date.now()}`,
        name: name,
        isGroup: true,
        isChannel: false,
        isFavorites: false,
        members: ['Вы'],
        lastMessage: 'Группа создана',
        time: getCurrentTime(),
        messages: [
            { id: Date.now().toString(), from: 'system', text: `Группа "${name}" создана`, time: getCurrentTime(), type: 'text' }
        ]
    };
    
    db.addChat(currentUser, newChat);
    elements.groupModal.classList.add('hidden');
    document.getElementById('group-name').value = '';
    
    loadUserData();
}

function createChannel() {
    const name = document.getElementById('channel-name').value.trim();
    const desc = document.getElementById('channel-desc').value;
    if (!name) return;
    
    const newChat = {
        id: `channel_${Date.now()}`,
        name: name,
        isGroup: false,
        isChannel: true,
        isFavorites: false,
        description: desc,
        lastMessage: 'Канал создан',
        time: getCurrentTime(),
        messages: [
            { id: Date.now().toString(), from: 'system', text: `Канал "${name}" создан${desc ? ': ' + desc : ''}`, time: getCurrentTime(), type: 'text' }
        ]
    };
    
    db.addChat(currentUser, newChat);
    elements.channelModal.classList.add('hidden');
    document.getElementById('channel-name').value = '';
    document.getElementById('channel-desc').value = '';
    
    loadUserData();
}

function showGroupModal() {
    elements.createDropdown.classList.add('hidden');
    elements.groupModal.classList.remove('hidden');
}

function showChannelModal() {
    elements.createDropdown.classList.add('hidden');
    elements.channelModal.classList.remove('hidden');
}

// Настройки
function showSettings() {
    elements.settingsPanel.classList.remove('hidden');
}

function hideSettings() {
    elements.settingsPanel.classList.add('hidden');
}

function toggleDarkMode(e) {
    if (e.target.checked) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
}

function toggleSound(e) {
    soundEnabled = e.target.checked;
    localStorage.setItem('sound', soundEnabled);
}

function loadThemePreference() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        elements.darkModeCheckbox.checked = true;
    }
}

function loadSoundPreference() {
    const saved = localStorage.getItem('sound');
    if (saved === 'false') {
        soundEnabled = false;
        elements.soundCheckbox.checked = false;
    }
}

function playNotificationSound() {
    if (soundEnabled && synth) {
        synth.triggerAttackRelease('C5', '8n');
    }
}

function logout() {
    currentUser = null;
    currentChatId = null;
    elements.mainApp.classList.add('hidden');
    elements.loginScreen.classList.add('active');
    elements.phoneInput.value = '';
    elements.codeInput.value = '';
}

function filterChats(e) {
    const query = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.chat-item');
    items.forEach(item => {
        const name = item.querySelector('.chat-name')?.textContent.toLowerCase();
        if (name?.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function toggleSendButton() {
    const hasText = elements.messageInput.value.trim().length > 0;
    elements.sendBtn.classList.toggle('hidden', !hasText);
    elements.micBtn.classList.toggle('hidden', hasText);
}

function setupEmojiPicker() {
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.addEventListener('click', () => {
            elements.messageInput.value += emoji;
            elements.emojiPicker.classList.add('hidden');
            elements.messageInput.focus();
            toggleSendButton();
        });
        elements.emojiPicker.appendChild(span);
    });
}

function toggleEmojiPicker() {
    elements.emojiPicker.classList.toggle('hidden');
}

function getCurrentTime() {
    return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Запуск приложения
init();
