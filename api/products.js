const Product = require('../db/Product');
const cache = require('../config/cache');

const getProducts = async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      carat: req.query.carat,
      price: req.query.price,
      search: req.query.search  
    };

    console.log(' Фільтри отримані бекендом:', filters);
    console.log(' Пошуковий запит:', req.query.search);

    const products = await Product.findAll(filters);
    
    console.log(' Результат фільтрації:', products.length, 'товарів');
    
    setTimeout(() => {
      res.json(products);
    }, 500);
    
  } catch (error) {
    console.error('Помилка отримання товарів:', error);
    res.status(500).json({ 
      success: false,
      message: 'Помилка сервера при отриманні товарів' 
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const key = 'product:' + req.params.id;
    const bypass = req.get('Cache-Control') === 'no-cache';

    if (!bypass) {
      const cached = await cache.get(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Товар не знайдено' 
      });
    }

    if (!bypass) {
      await cache.set(key, product);
    }

    res.set('X-Cache', bypass ? 'BYPASS' : 'MISS');
    res.json(product);
  } catch (error) {
    console.error('Помилка отримання товару:', error);
    res.status(500).json({ 
      success: false,
      message: 'Помилка сервера при отриманні товару' 
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const { type, title, carat, price, image, description } = req.body;

    if (!type || !title || carat === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Обовʼязкові поля: type, title, carat, price'
      });
    }

    const product = await Product.create({ type, title, carat, price, image, description });
    res.status(201).json(product);
  } catch (error) {
    console.error('Помилка створення товару:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка сервера при створенні товару'
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct
};