const path = require('path');
const express = require('express');

const routes = require('./routes');

const app = express();

app.use(express.json());
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use(express.static(path.join(__dirname, 'public', 'html'), { index: false }));

// mount API routes under /api
app.use('/api', routes);

// UI page routes
const pageMap = {
  '/': 'login',
  '/login': 'login',
  '/register': 'register',
  '/user': 'user',
  '/user/profile': 'user-profile',
  '/admin': 'admin',
  '/admin/profile': 'admin-profile',
};

Object.entries(pageMap).forEach(([route, page]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', `${page}.html`));
  });
});

module.exports = app;
