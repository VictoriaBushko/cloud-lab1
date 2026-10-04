# Cloud Lab 1 — Jewelry Store API

REST API для інтернет-магазину коштовностей. Бекенд написаний на Node.js (Express) з базою даних MySQL, запакований у Docker.

Проєкт зроблений на основі моєї минулорічної лабораторної з веброзробки.

**Публічна адреса:** 

## Ендпоінти

- `GET /api/health` — перевірка стану сервера
- `GET /api/products` — список товарів (фільтри: type, carat, price, search)
- `GET /api/products/:id` — товар за id
- `POST /api/products` — додати товар

## Структура
```
server.js — точка входу
config/ — підключення до бази даних
db/ — запити до бази
api/ — обробники запитів
routes/ — маршрути
middleware/ — обробка помилок
static/ — зображення товарів
Dockerfile
compose.yaml
```

## Запуск локально
```
cp .env.example .env
docker compose up -d --build
```

Застосунок буде на `http://localhost:3001`.