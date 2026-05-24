// Инициализация
let currentChat = null;
let socket = null;
let currentUserId = 'user_' + Math.random().toString(36).substr(2, 9);
let messages = {};
let chats = [];

// Демо данные
const demoChats = [
    { id: '1', name: 'Алексей', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', lastMessage: 'Привет! Как дела?', time: '12:30', online: true, bio: 'Разработчик из Москвы' },
    { id: '2', name: 'Мария', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', lastMessage: 'Скинь фото', time: '11:45', online: false, bio: 'Дизайнер, люблю кофе ☕' },
    { id: '3', name: 'Дмитрий', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', lastMessage: 'Завтра встреча в 15:00', time: '10:20', online: true, bio: 'Team Lead' },
];

// Демо сообщения
const demoMessages = {
    '1': [
        { id: 'm1', text: 'Привет!', sender: '1', time: '12:30', outgoing: false },
        { id: 'm2', text: 'Здравствуй! Как твои дела?', sender: currentUserId, time: '12:31', outgoing: true },
        { id: 'm3', text: 'Отлично, спасибо! А у тебя?', sender: '1', time: '12:32', outgoing: false },
    ],
    '2': [
        { id: 'm4', text: 'Привет! Давно не виделись', sender: '2', time: '11:45', outgoing: false },
    ],
    '3': [
        { id: 'm5', text: 'Всем привет!', sender: '3', time: '10:20', outgoing: false },
    ],
};

// Инициализация приложения
function init() {
    loadChats();
    setupSocket();
    setupEventListeners();
}

function loadChats() {
    chats = [...demoChats];
    renderChatsList();
}

function renderChatsList() {
    const container = document.getElementById('chatsList');
    container.innerHTML = chats.map(chat => `
        <div class="chat-item" data-chat-id="${chat.id}">
            <img src="${chat.avatar}" class="avatar" alt="${chat.name}">
            <div class="chat-info">
                <div class="chat-name">${chat.name}</div>
                <div class="last-message">${chat.lastMessage}</div>
            </div>
            <div class="message-time">${chat.time}</div>
        </div>
    `).join('');
    
    // Добавляем обработчики для чатов
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => openChat(item.dataset.chatId));
    });
}

function openChat(chatId) {
    currentChat = chats.find(c => c.id === chatId);
    if (!currentChat) return;
    
    // Update UI
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chatId) {
            item.classList.add('active');
        }
    });
    
    // Update header
    document.getElementById('chatName').innerText = currentChat.name;
    document.getElementById('chatAvatar').src = currentChat.avatar;
    document.getElementById('chatStatus').innerText = currentChat.online ? 'онлайн' : 'был(а) недавно';
    
    // Enable input
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    
    // Load messages
    loadMessages(chatId);
}

function loadMessages(chatId) {
    const container = document.getElementById('messagesArea');
    const chatMessages = demoMessages[chatId] || [];
    
    if (chatMessages.length === 0) {
        container.innerHTML = '<div class="welcome-message"><i class="fas fa-comment-dots"></i><p>Нет сообщений. Напишите что-нибудь!</p></div>';
        return;
    }
    
    container.innerHTML = chatMessages.map(msg => `
        <div class="message ${msg.outgoing ? 'outgoing' : 'incoming'}">
            <div class="message-bubble">
                <div class="message-text">${escapeHtml(msg.text)}</div>
                <div class="message-time">${msg.time}</div>
            </div>
        </div>
    `).join('');
    
    scrollToBottom();
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentChat) return;
    
    const newMessage = {
        id: Date.now().toString(),
        text: text,
        sender: currentUserId,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }),
        outgoing: true
    };
    
    // Add to demo messages
    if (!demoMessages[currentChat.id]) {
        demoMessages[currentChat.id] = [];
    }
    demoMessages[currentChat.id].push(newMessage);
    
    // Update last message in chat list
    const chat = chats.find(c => c.id === currentChat.id);
    if (chat) {
        chat.lastMessage = text;
        chat.time = newMessage.time;
    }
    
    // Reload messages and chat list
    loadMessages(currentChat.id);
    renderChatsList();
    
    // Clear input
    input.value = '';
    
    // Simulate reply (как в реальном телеграме)
    setTimeout(() => {
        simulateReply(currentChat.id);
    }, 1000 + Math.random() * 3000);
    
    // Emit via socket if connected
    if (socket && socket.connected) {
        socket.emit('send_message', {
            to: currentChat.id,
            text: text,
            from: currentUserId
        });
    }
}

function simulateReply(chatId) {
    const replies = [
        'Отлично! 👍', 'Понял, принято', 'Спасибо за информацию!', 
        'Хорошо, договорились', '😊', 'Скоро отвечу', 'Понял, спасибо'
    ];
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    
    const replyMessage = {
        id: Date.now().toString(),
        text: randomReply,
        sender: chatId,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }),
        outgoing: false
    };
    
    if (!demoMessages[chatId]) {
        demoMessages[chatId] = [];
    }
    demoMessages[chatId].push(replyMessage);
    
    if (currentChat && currentChat.id === chatId) {
        loadMessages(chatId);
    }
    
    // Update last message
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        chat.lastMessage = randomReply;
        chat.time = replyMessage.time;
        renderChatsList();
    }
}

function setupSocket() {
    // Для реального WebSocket соединения раскомментировать и запустить server.js
    // socket = io('http://localhost:3000');
    // 
    // socket.on('receive_message', (data) => {
    //     const newMessage = {
    //         id: Date.now().toString(),
    //         text: data.text,
    //         sender: data.from,
    //         time: new Date().toLocaleTimeString(),
    //         outgoing: false
    //     };
    //     if (!demoMessages[data.from]) demoMessages[data.from] = [];
    //     demoMessages[data.from].push(newMessage);
    //     if (currentChat && currentChat.id === data.from) loadMessages(data.from);
    // });
}

function setupEventListeners() {
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = chats.filter(chat => chat.name.toLowerCase().includes(searchTerm));
        renderFilteredChats(filtered);
    });
    
    document.querySelector('.fa-info-circle').addEventListener('click', () => {
        const panel = document.getElementById('infoPanel');
        panel.classList.add('active');
        document.getElementById('infoAvatar').src = currentChat?.avatar || '';
        document.getElementById('infoName').innerText = currentChat?.name || '';
        document.getElementById('infoBio').innerText = currentChat?.bio || 'Нет информации';
    });
    
    document.getElementById('closeInfo').addEventListener('click', () => {
        document.getElementById('infoPanel').classList.remove('active');
    });
    
    // Эмодзи (упрощенно)
    document.querySelector('.fa-smile').addEventListener('click', () => {
        const emojis = ['😊', '😂', '❤️', '👍', '🔥', '🎉', '😢', '😎'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        document.getElementById('messageInput').value += randomEmoji;
    });
}

function renderFilteredChats(filteredChats) {
    const container = document.getElementById('chatsList');
    container.innerHTML = filteredChats.map(chat => `
        <div class="chat-item" data-chat-id="${chat.id}">
            <img src="${chat.avatar}" class="avatar" alt="${chat.name}">
            <div class="chat-info">
                <div class="chat-name">${chat.name}</div>
                <div class="last-message">${chat.lastMessage}</div>
            </div>
            <div class="message-time">${chat.time}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => openChat(item.dataset.chatId));
    });
}

function scrollToBottom() {
    const container = document.getElementById('messagesArea');
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Запуск приложения
init();
