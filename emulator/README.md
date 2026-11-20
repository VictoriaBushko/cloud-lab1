Емулятор датчиків

Емулює три датчики (температура, вологість, освітленість) і камеру. Кожен датчик шле вимірювання окремим POST у JSON: sensor_id, sensor_type, value, unit, location і measured_at. Раз на 5 секунд і в кінці емулятор виводить, скільки повідомлень надіслано і скільки було помилок.

Камера раз на 10-30 секунд просить підписане посилання, завантажує знімок (PNG до 1 МБ) у S3 і потім шле в /ingest повідомлення з object_key. Докладніше в docs/BLOB.md.

config.json

- durationSec: скільки секунд працює емулятор
- sensors: список датчиків, у кожного свій intervalMs (від 20 до 100 мс), діапазон значень і координати
- cameras: список камер з періодом minIntervalSec і maxIntervalSec

Змінні середовища

Перекривають config.json:

- INGEST_URL: адреса приймача, за замовчуванням http://localhost:8080/ingest
- API_KEY: ключ для заголовка x-api-key, за замовчуванням dev-key
- INTERVAL_MS, DURATION_SEC: період і тривалість
- NO_CAMERA=1: вимкнути камеру (для локального mock-receiver)

Запуск

Локально:

```
node mock-receiver.js
NO_CAMERA=1 node emulator.js
```

У контейнері:

```
docker build -t sensor-emulator .
docker run --rm -e NO_CAMERA=1 -e INGEST_URL=http://host.docker.internal:8080/ingest sensor-emulator
```

Ключ API у репозиторії не зберігається, у хмару він передається через змінну API_KEY.