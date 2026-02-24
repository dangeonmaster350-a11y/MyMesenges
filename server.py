from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Инициализация базы данных
def init_db():
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT,
                  message TEXT,
                  timestamp TEXT)''')
    conn.commit()
    conn.close()

init_db()

# Главная страница
@app.route('/')
def index():
    return render_template('index.html')

# Получение истории сообщений
@app.route('/get_messages')
def get_messages():
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute("SELECT username, message, timestamp FROM messages ORDER BY id DESC LIMIT 50")
    messages = c.fetchall()
    conn.close()
    return jsonify(messages)

# WebSocket для реального времени
@socketio.on('send_message')
def handle_message(data):
    username = data['username']
    message = data['message']
    timestamp = datetime.now().strftime('%H:%M:%S')
    
    # Сохраняем в базу данных
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute("INSERT INTO messages (username, message, timestamp) VALUES (?, ?, ?)",
              (username, message, timestamp))
    conn.commit()
    conn.close()
    
    # Отправляем всем
    emit('new_message', {
        'username': username,
        'message': message,
        'timestamp': timestamp
    }, broadcast=True)

@socketio.on('user_typing')
def handle_typing(data):
    emit('user_typing', data, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)