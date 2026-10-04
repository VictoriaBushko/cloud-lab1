
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.message.includes('Помилка бази даних')) {
    return res.status(500).json({
      success: false,
      message: 'Помилка бази даних',
      error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
  }

  res.status(500).json({
    success: false,
    message: 'Внутрішня помилка сервера',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
};

module.exports = errorHandler;
