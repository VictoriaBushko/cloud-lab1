Емулятор датчиків:

Емулює три датчики: температуру, вологість і освітленість. Кожен датчик надсилає вимірювання окремим POST-запитом у JSON з полями sensor_id, sensor_type, value, unit, location (lat, lon) і measured_at (UTC, ISO 8601). Раз на 5 секунд і в кінці роботи у журнал виводиться кількість надісланих повідомлень і помилок.

Налаштування в config.json:

intervalMs: у кожного датчика в списку sensors свій період надсилання, від 20 до 100 мс.
durationSec: скільки секунд працює емулятор (для демонстрації 300-600).
sensors: список датчиків із діапазоном значень і координатами.

Змінні середовища (перекривають config.json):

INGEST_URL: адреса приймача, за замовчуванням http://localhost:8080/ingest.
API_KEY: ключ для заголовка x-api-key, за замовчуванням dev-key.
INTERVAL_MS і DURATION_SEC: період і тривалість.

Запуск локально (потрібен Node 20):

node mock-receiver.js
node emulator.js

Запуск у контейнері:

docker build -t sensor-emulator .
docker run --rm -e INGEST_URL=http://host.docker.internal:8080/ingest sensor-emulator

Ключ API не зберігається в репозиторії, у хмару він передається через змінну середовища API_KEY.