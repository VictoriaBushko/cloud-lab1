Cloud Lab 3: обробка даних з IoT-сенсорів (serverless)

Конвеєр обробки подій: емулятор датчиків надсилає вимірювання через REST у чергу SQS, функції AWS Lambda обробляють повідомлення і зберігають результати в MySQL, окремий запит повертає історію вимірювань.

**Публічна адреса приймача:** https://wua63fmjyd.execute-api.eu-central-1.amazonaws.com/ingest (діє лише під час демонстрації)

Архітектура

Схема і опис компонентів у `docs/ARCHITECTURE.md`. Коротко: емулятор → API Gateway → Lambda ingest → SQS → Lambda processor → RDS MySQL; історія читається через GET /sensors/{sensor_id}/history.

Структура
emulator/ — емулятор датчиків (Node.js), Dockerfile, інструкція
functions/ingest/ — функція приймання (валідація і запис у чергу)
functions/worker/ — функції processor (обробка) і history (читання)
terraform/ — уся інфраструктура в AWS
docs/ — документація

Розгортання
cd functions/worker
npm install --omit=dev
cd ../../terraform
terraform init
terraform apply


Адреса приймача і ключ API:

terraform output -raw ingest_url
terraform output -raw api_key


Запуск емулятора

cd emulator
INGEST_URL=<адреса> API_KEY=<ключ> node emulator.js


Докладніше в `emulator/README.md`.

Перевірка історії

curl -s -H “x-api-key: $KEY” “$API/sensors/temp-01/history?limit=5”


Документація

- `docs/ARCHITECTURE.md` — архітектура
- `docs/INGEST.md` — приймання даних
- `docs/PROCESSING.md` — обробка функціями
- `docs/DATA.md` — база і історія
- `docs/DLQ.md` — черга недоставлених повідомлень

Видалення

cd terraform
terraform destroy