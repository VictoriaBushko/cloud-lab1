const error = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' }
  }
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Jewelry Store API',
    version: '1.0.0',
    description: 'REST API ювелірного магазину (Cloud Services Lab 1)'
  },
  servers: [{ url: '/' }],
  paths: {
    '/api/health': {
      get: {
        summary: 'Перевірка стану сервера',
        responses: {
          200: {
            description: 'Сервер працює',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/products': {
      get: {
        summary: 'Список товарів із фільтрами',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'carat', in: 'query', schema: { type: 'string' } },
          { name: 'price', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Масив товарів',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } }
              }
            }
          },
          500: { description: 'Помилка сервера', content: { 'application/json': { schema: error } } }
        }
      },
      post: {
        summary: 'Створити товар',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NewProduct' } } }
        },
        responses: {
          201: {
            description: 'Товар створено',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } }
          },
          400: { description: 'Не вистачає обовʼязкових полів', content: { 'application/json': { schema: error } } },
          500: { description: 'Помилка сервера', content: { 'application/json': { schema: error } } }
        }
      }
    },
    '/api/products/{id}': {
      get: {
        summary: 'Товар за id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Товар',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } }
          },
          404: { description: 'Товар не знайдено', content: { 'application/json': { schema: error } } },
          500: { description: 'Помилка сервера', content: { 'application/json': { schema: error } } }
        }
      }
    },
    '/api/button-click': {
      get: {
        summary: 'Зафіксувати натискання кнопки',
        parameters: [{ name: 'button', in: 'query', schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Клік зафіксовано',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    button: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      NewProduct: {
        type: 'object',
        required: ['type', 'title', 'carat', 'price'],
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          carat: { type: 'number' },
          price: { type: 'number' },
          image: { type: 'string' },
          description: { type: 'string' }
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          type: { type: 'string' },
          title: { type: 'string' },
          carat: { type: 'number' },
          price: { type: 'number' },
          image: { type: 'string' },
          description: { type: 'string' }
        }
      }
    }
  }
};