Практична робота №4 — REST API для енергетичних даних
Дисципліна: Основи веб-програмування
Варіант 12: Діагностика технічного стану (ДБЖ)

Опис
REST API для обліку пристроїв ДБЖ та записів їх діагностики. Реалізовано два ресурси з повним набором CRUD-операцій (GET, POST, PUT, DELETE). Дані зберігаються у JSON-файлах. За адресою / доступна вбудована веб-сторінка з API-тестером.

Запуск
bashnpm install
npm start
# Сервер: http://localhost:3000

API маршрути
/api/ups — Пристрої ДБЖ
МетодМаршрутОписGET/api/upsСписок усіх пристроїв (?status= ?location=)GET/api/ups/statsСтатистикаGET/api/ups/:idОдин пристрійPOST/api/upsДодати пристрійPUT/api/ups/:idОновити пристрійDELETE/api/ups/:idВидалити пристрій
/api/diagnostics — Діагностика
МетодМаршрутОписGET/api/diagnosticsВсі записи (?result= ?upsId=)GET/api/diagnostics/statsСтатистикаGET/api/diagnostics/:idОдин записPOST/api/diagnosticsДодати записPUT/api/diagnostics/:idОновити записDELETE/api/diagnostics/:idВидалити запис

Структура проєкту
/
├── server.js            ← Express REST API
├── package.json
├── public/
│   └── index.html       ← Документація + API тестер
├── data/
│   ├── ups.json         ← Дані пристроїв
│   └── diagnostics.json ← Записи діагностики
└── README.md

Приклад POST /api/ups
json{
  "model": "APC Smart-UPS 1500",
  "serialNumber": "SUA1500-001",
  "powerKva": 1.5,
  "location": "ПС-110 кВ Північна",
  "batteryCapacityAh": 18,
  "installDate": "2023-05-10",
  "status": "active"
}
Приклад POST /api/diagnostics
json{
  "upsId": "1234567890",
  "diagnosticDate": "2025-05-16",
  "result": "warning",
  "batteryHealth": 72,
  "inputVoltage": 224,
  "outputVoltage": 220,
  "loadPercent": 65,
  "notes": "Знижена ємність батареї"
}
