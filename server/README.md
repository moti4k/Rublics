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
