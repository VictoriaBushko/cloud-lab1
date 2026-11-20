Cloud Lab 3

Емулятор шле вимірювання на API Gateway, звідти вони йдуть у чергу SQS, їх обробляє Lambda і зберігає в MySQL (RDS). Історію можна отримати окремим запитом. Сирі дані ще пишуться в DynamoDB, а знімки з камери лежать у S3.

Адреса приймача:

Папки

- emulator - емулятор датчиків і камери
- functions/ingest - функція приймання
- functions/worker - обробка, історія, посилання для знімків
- terraform - інфраструктура
- docs - документація

Запуск

```
cd functions/worker
npm install --omit=dev
cd ../../terraform
terraform init
terraform apply
```

Адреса і ключ:

```
URL=$(terraform output -raw ingest_url)
KEY=$(terraform output -raw api_key)
API=$(terraform output -raw api_url)
```

Емулятор:

```
cd ../emulator
INGEST_URL=$URL API_KEY=$KEY node emulator.js
```

Історія датчика:

```
curl -s -H "x-api-key: $KEY" "$API/sensors/temp-01/history?limit=5"
```

Документація

- [ARCHITECTURE.md](docs/ARCHITECTURE.md): архітектура
- [INGEST.md](docs/INGEST.md): приймання даних
- [PROCESSING.md](docs/PROCESSING.md): обробка
- [DATA.md](docs/DATA.md): база і історія
- [DLQ.md](docs/DLQ.md): черга недоставлених повідомлень
- [NOSQL.md](docs/NOSQL.md): сирі дані в DynamoDB
- [BLOB.md](docs/BLOB.md): знімки камери в S3