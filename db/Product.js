const { pool } = require('../config/database');

class Product {
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    console.log(' Фільтри в Product.findAll:', filters);

    if (filters.type && filters.type !== 'any') {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.carat && filters.carat !== 'any') {
      switch (filters.carat) {
        case '0-1':
          query += ' AND carat >= 0 AND carat < 1';
          break;
        case '1-2':
          query += ' AND carat >= 1 AND carat < 2';
          break;
        case '2-3':
          query += ' AND carat >= 2 AND carat < 3';
          break;
        case '3+':
          query += ' AND carat >= 3';
          break;
      }
    }

    if (filters.price && filters.price !== 'any') {
      switch (filters.price) {
        case '0-5000':
          query += ' AND price >= 0 AND price < 5000';
          break;
        case '5000-9000':
          query += ' AND price >= 5000 AND price < 9000';
          break;
        case '9000+':
          query += ' AND price >= 9000';
          break;
      }
    }

    if (filters.search && filters.search.trim() !== '') {
      query += ' AND (title LIKE ? OR description LIKE ? OR type LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      console.log(' Виконую пошук за:', searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    console.log(' SQL запит:', query);
    console.log(' Параметри:', params);

    try {
      const [rows] = await pool.execute(query, params);
      console.log(' Знайдено товарів:', rows.length);
      return rows;
    } catch (error) {
      throw new Error(`Помилка бази даних: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Помилка бази даних: ${error.message}`);
    }
  }

  static async create({ type, title, carat, price, image, description }) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO products (type, title, carat, price, image, description) VALUES (?, ?, ?, ?, ?, ?)',
        [type, title, carat, price, image || null, description || null]
      );
      return this.findById(result.insertId);
    } catch (error) {
      throw new Error(`Помилка бази даних: ${error.message}`);
    }
  }
}

module.exports = Product;