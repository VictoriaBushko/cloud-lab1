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
terraform/ — інфраструктура в AWS
.github/workflows/ — автоматичний деплой
```

## Запуск локально

```
cp .env.example .env
docker compose up -d --build
```

Застосунок буде на `http://localhost:3001`.

## Розгортання в AWS

Інфраструктура описана в Terraform: мережа, ECR, база RDS MySQL у приватній підмережі, ECS Fargate і балансувальник.

```
cd terraform
terraform init
terraform apply
```

Після `apply` треба один раз запустити workflow Deploy у вкладці Actions, щоб образ потрапив в ECR. Далі кожен пуш у `main` збирає образ (тег — хеш коміту) і оновлює сервіс. Вхід в AWS з GitHub Actions іде через OIDC. Видалити все: `terraform destroy`.