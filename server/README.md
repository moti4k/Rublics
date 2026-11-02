# Сервер Рубликс

Из корня репозитория: `npm ci`, затем `npm start`.
Сайт и API доступны на [localhost:3000](http://localhost:3000).
Полная инструкция — в [корневом README](../README.md).

Переменные окружения: `PORT` (3000), `RUBLIKS_DB_PATH` (путь к SQLite),
`CORS_ORIGIN` (опциональный разрешённый origin для отдельного фронтенда).
База создаётся автоматически и не коммитится. Сессии действуют до 30 дней.

API: `POST /api/register`, `/api/login`, `/api/logout`, `GET/PATCH /api/me`,
`GET/PATCH /api/portfolio`, `GET/POST /api/friends`, `POST /api/game/quiz/complete`.
Защищённые запросы используют `Authorization: Bearer <token>`.
Серверный лимит викторины — 25 завершений в день по UTC.
Клиентские тарифы демонстрационные; сервер не подтверждает оплату или правильность ответов.

Рынок не требует аккаунта: `GET /api/market/quotes?securities=SBER,GAZP`,
`GET /api/market/candles?ticker=SBER&interval=24&from=2026-10-01&till=2026-11-02`,
`GET /api/market/orderbook?ticker=SBER`. Разрешены только ресурсы MOEX TQBR,
свечные интервалы 10/60/24 и проверенные символы. Есть кеш и объединение запросов.
Публичные данные задержаны на 15 минут; при недоступности endpoint возвращает 503,
а если нужна подписка на стакан — 403. Сохранённые данные отмечаются `_market.stale`.
Произвольные внешние адреса шлюз не принимает.
