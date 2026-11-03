# Cloud Lab 1 — Jewelry Store API

REST API для інтернет-магазину коштовностей. Бекенд написаний на Node.js (Express) з базою даних MySQL, запакований у Docker.

Проєкт зроблений на основі моєї минулорічної лабораторної з веброзробки.

**Публічна адреса:** http://cloud-lab1-694705022.eu-central-1.elb.amazonaws.com (діє лише під час демонстрації)

## Ендпоінти

- `GET /api/health` — перевірка стану сервера
- `GET /api/products` — список товарів (фільтри: type, carat, price, search)
- `GET /api/products/:id` — товар за id
- `POST /api/products` — додати товар
- `GET /api-docs` — Swagger UI з документацією API (OpenAPI 3.0)

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

Перший образ збирається і публікується в ECR автоматично під час `apply`. Далі кожен пуш у `main` збирає образ (тег — хеш коміту) і оновлює сервіс. Вхід в AWS з GitHub Actions іде через OIDC. Видалити все: `terraform destroy`.


## Лабораторна 2

Масштабування, навантажувальне тестування, моніторинг і кешування. Опис і результати в папці docs:

- `docs/AUTOSCALING.md` — автомасштабування, параметри і пояснення
- `docs/LOADTEST.md` — сценарій k6 і результати
- `docs/ALERTS.md` — сповіщення на пошту
- `docs/CACHE.md` — кеш у пам'яті і порівняння
- `docs/SCHEDULE.md` — масштабування за розкладом і розрахунок економії

Тест запускається командою `k6 run -e BASE_URL=http://адреса loadtest/test.js`. Адреса сервісу з'являється після `terraform apply` і діє лише під час демонстрації.