const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { createTable } = require('./config/database');
const productsRouter = require('./routes/products');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'static')));

app.use('/api/products', productsRouter);

app.get('/api/button-click', (req, res) => {
  const buttonName = req.query.button;
  console.log(` Кнопка натиснута: ${buttonName}`);
  
  res.json({ 
    success: true, 
    message: 'Клік зафіксовано',
    button: buttonName,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Сервер працює!', 
    timestamp: new Date().toISOString() 
  });
});

app.use(errorHandler);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не знайдено'
  });
});

const startServer = async () => {
  try {
    await createTable();
    
    app.listen(PORT, () => {
      console.log(` Сервер запущено на порті ${PORT}`);
      console.log(` API: http://localhost:${PORT}/api/products`);
      console.log(` Кнопки: http://localhost:${PORT}/api/button-click`);
      console.log(` Фото: http://localhost:${PORT}/stone1.jpg`);
    });
  } catch (error) {
    console.error(' Помилка запуску сервера:', error);
    process.exit(1);
  }
};

startServer();