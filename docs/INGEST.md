Приймання даних

Приймач це API Gateway і Lambda ingest, яка кладе повідомлення в чергу SQS. Код у functions/ingest/index.js, інфраструктура в terraform/ingest.tf.

Запит

POST /ingest, заголовки x-api-key і Content-Type: application/json.

Поля (усі обов'язкові):

- sensor_id: ідентифікатор датчика
- sensor_type: temperature, humidity, light або camera
- value: число
- unit: одиниця виміру
- location: lat і lon
- measured_at: час у UTC, ISO 8601

Для камери ще object_key (ключ знімка в S3), value це розмір знімка в байтах. Сам знімок сюди не йде, див. docs/BLOB.md.

```
curl -i -X POST $URL -H "x-api-key: $KEY" -H "Content-Type: application/json" -d '{"sensor_id":"temp-01","sensor_type":"temperature","value":21.5,"unit":"C","location":{"lat":50.45,"lon":30.52},"measured_at":"2026-11-19T19:30:00Z"}'
```

Відповіді

- 202: прийнято, у тілі message_id з черги
- 400: поганий JSON або поле не пройшло перевірку
- 401: нема ключа або він неправильний
- 500: черга чи ключ недоступні

Камера: POST /upload-url

Тіло {"sensor_id":"cam-01","size":123456}. Відповідь 200 з upload_url (посилання PUT на 5 хвилин) і object_key. Якщо size більше 1 МБ, буде 400. Докладніше в docs/BLOB.md.

Чому приймач нічого не обробляє

Він має лише швидко прийняти і відповісти. Якби він ще й писав у базу, відповідь залежала б від бази, і під навантаженням датчики отримували б помилки та втрачали дані. З чергою приймач відповідає за десятки мілісекунд, а повідомлення чекають у черзі, поки їх обробить processor, навіть якщо обробка зламалась. Приймання і обробку можна масштабувати окремо.

Захист

Ключ API і ліміт на шлюзі: 500 запитів на секунду.