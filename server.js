const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const db = new sqlite3.Database('./database.db');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'garden_secret', resave: false, saveUninitialized: true }));

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, user_id INTEGER, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
    db.run("CREATE TABLE IF NOT EXISTS reactions (id INTEGER PRIMARY KEY, post_id INTEGER, user_id INTEGER)");
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashed], function(err) {
        if (err) return res.redirect('/');
        req.session.userId = this.lastID;
        res.redirect('/profile');
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            res.redirect('/profile');
        } else {
            res.redirect('/');
        }
    });
});

app.get('/profile', (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    res.sendFile(__dirname + '/public/profile.html');
});

app.post('/post', (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const { content } = req.body;
    db.run("INSERT INTO posts (user_id, content) VALUES (?, ?)", [req.session.userId, content]);
    res.redirect('/profile');
});

app.get('/posts', (req, res) => {
    db.all("SELECT posts.id, posts.content, posts.timestamp, users.username, (SELECT COUNT(*) FROM reactions WHERE post_id = posts.id) as likes FROM posts JOIN users ON users.id = posts.user_id ORDER BY posts.timestamp DESC", (err, posts) => {
        res.json(posts);
    });
});

app.post('/react', (req, res) => {
    const { postId } = req.body;
    if (!req.session.userId) return res.redirect('/');
    db.run("INSERT INTO reactions (post_id, user_id) VALUES (?, ?)", [postId, req.session.userId]);
    res.redirect('/profile');
});

io.on('connection', socket => {
    socket.on('chat message', msg => {
        io.emit('chat message', msg);
    });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));