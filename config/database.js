const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jewelry_store',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const createTable = async () => {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        carat DECIMAL(4,2) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        image VARCHAR(500),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.execute(createTableSQL);
    console.log(' Таблиця products створена/готова');

    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM products');
    if (rows[0].count === 0) {
      console.log(' Додаємо тестові дані...');
      await insertSampleData();
    }
  } catch (error) {
    console.error(' Помилка створення таблиці:', error);
  }
};

const insertSampleData = async () => {
  const sampleProducts = [
    {
      type: "Diamond",
      title: "Round Brilliant Diamond",
      carat: 2.1,
      price: 12600.00,
      image: "/stone1.jpg",
      description: "Класичний круглий діамант, прозорість VVS1, колір D. Ідеальний блиск."
    },
    {
      type: "Sapphire", 
      title: "Royal Blue Sapphire",
      carat: 2.0,
      price: 6700.00,
      image: "/stone2.jpg",
      description: "Насичений небесно-синій сапфір зі Шрі-Ланки. Символ мудрості й відданості."
    },
    {
      type: "Ruby",
      title: "Pigeon Blood Ruby", 
      carat: 2.5,
      price: 9000.00,
      image: "/stone3.jpg",
      description: "Яскраво-червоний рубін з високою насиченістю кольору. Енергія та пристрасть."
    },
    {
      type: "Diamond",
      title: "Emerald-Cut Diamond",
      carat: 1.5,
      price: 8400.00,
      image: "/stone1.jpg",
      description: "Сходинкове огранювання, акцент на чистоті каменя. Витончена геометрія."
    },
    {
      type: "Sapphire",
      title: "Cornflower Sapphire", 
      carat: 1.9,
      price: 7100.00,
      image: "/stone2.jpg",
      description: "Легкий «васильковий» відтінок, рідкісний тон. Гармонійний баланс кольору."
    },
    {
      type: "Ruby",
      title: "Oval Ruby",
      carat: 2.6, 
      price: 9500.00,
      image: "/stone3.jpg",
      description: "Овальне огранювання, теплий червоний. Виглядає більшим за свій карат."
    }
  ];

  try {
    for (const product of sampleProducts) {
      await pool.execute(
        'INSERT INTO products (type, title, carat, price, image, description) VALUES (?, ?, ?, ?, ?, ?)',
        [product.type, product.title, product.carat, product.price, product.image, product.description]
      );
    }
    console.log(' Тестові дані додані успішно');
  } catch (error) {
    console.error(' Помилка додавання тестових даних:', error);
  }
};

module.exports = { pool, createTable };