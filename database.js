// database.js - Управление пользователями и данными через localStorage

class Database {
    constructor() {
        this.STORAGE_KEY = 'fastmessage_db';
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            const initialData = {
                users: {},
                verificationCodes: {}
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialData));
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY));
    }

    saveData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    // Регистрация или вход пользователя
    registerOrLogin(phone) {
        const data = this.getData();
        
        if (!data.users[phone]) {
            // Новый пользователь
            data.users[phone] = {
                phone: phone,
                name: `User_${phone.slice(-4)}`,
                username: `user${phone.slice(-4)}`,
                email: `${phone.replace(/[^0-9]/g, '')}@fastmessage.com`,
                createdAt: Date.now(),
                chats: this.getDefaultChats()
            };
            this.saveData(data);
        }
        
        // Генерируем код подтверждения
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 5 * 60 * 1000; // 5 минут
        
        data.verificationCodes[phone] = { code, expiry };
        this.saveData(data);
        
        return { code, email: data.users[phone].email };
    }

    // Проверка кода
    verifyCode(phone, code) {
        const data = this.getData();
        const record = data.verificationCodes[phone];
        
        if (!record) return false;
        if (Date.now() > record.expiry) return false;
        if (record.code !== code) return false;
        
        // Удаляем использованный код
        delete data.verificationCodes[phone];
        this.saveData(data);
        return true;
    }

    // Получить пользователя
    getUser(phone) {
        const data = this.getData();
        return data.users[phone] || null;
    }

    // Сохранить чаты пользователя
    saveUserChats(phone, chats) {
        const data = this.getData();
        if (data.users[phone]) {
            data.users[phone].chats = chats;
            this.saveData(data);
        }
    }

    // Стандартные чаты для нового пользователя
    getDefaultChats() {
        return [
            {
                id: 'favorites',
                name: 'Избранное',
                isFavorites: true,
                isGroup: false,
                isChannel: false,
                avatar: '⭐',
                lastMessage: 'Ваши заметки',
                time: '',
                messages: [
                    { id: 'msg1', from: 'me', text: 'Добро пожаловать в Избранное! Здесь хранятся ваши заметки.', time: this.getCurrentTime(), type: 'text' }
                ]
            },
            {
                id: 'alisa',
                name: 'Алиса',
                isFavorites: false,
                isGroup: false,
                isChannel: false,
                online: true,
                lastMessage: 'Привет! Как дела?',
                time: this.getCurrentTime(),
                messages: [
                    { id: 'msg2', from: 'them', text: 'Привет! Как дела?', time: this.getCurrentTime(), type: 'text' },
                    { id: 'msg3', from: 'me', text: 'Отлично, спасибо! А у тебя?', time: this.getCurrentTime(), type: 'text' }
                ]
            },
            {
                id: 'dev_team',
                name: 'Команда разработки',
                isFavorites: false,
                isGroup: true,
                isChannel: false,
                members: ['Алиса', 'Марк', 'Вы'],
                lastMessage: 'Обсуждение нового релиза',
                time: this.getCurrentTime(),
                messages: [
                    { id: 'msg4', from: 'other', author: 'Марк', text: 'Завтра в 12:00 созвон', time: this.getCurrentTime(), type: 'text' }
                ]
            }
        ];
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    // Добавить чат
    addChat(phone, chat) {
        const user = this.getUser(phone);
        if (user) {
            user.chats.unshift(chat);
            this.saveUserChats(phone, user.chats);
            return true;
        }
        return false;
    }

    // Добавить сообщение
    addMessage(phone, chatId, message) {
        const user = this.getUser(phone);
        if (user) {
            const chat = user.chats.find(c => c.id === chatId);
            if (chat) {
                chat.messages.push(message);
                chat.lastMessage = message.text;
                chat.time = this.getCurrentTime();
                this.saveUserChats(phone, user.chats);
                return true;
            }
        }
        return false;
    }

    // Удалить сообщение (пометить как удаленное)
    deleteMessage(phone, chatId, messageId) {
        const user = this.getUser(phone);
        if (user) {
            const chat = user.chats.find(c => c.id === chatId);
            if (chat) {
                const msg = chat.messages.find(m => m.id === messageId);
                if (msg && msg.from === 'me') {
                    msg.text = 'Сообщение удалено';
                    msg.deleted = true;
                    this.saveUserChats(phone, user.chats);
                    return true;
                }
            }
        }
        return false;
    }
}

// Создаем глобальный экземпляр
const db = new Database();
