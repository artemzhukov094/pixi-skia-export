# Pixi to Skia PDF Export

TypeScript-приложение для демонстрации конвертации сцены из Pixi.js в Skia-модель с последующим preview-рендером и экспортом в PDF.

Сцена создается как `PIXI.Container`, затем обходится и преобразуется в сериализуемую модель. Та же модель отправляется на Express backend, где `skia-canvas` рендерит PNG-превью и PDF-файл.

## Возможности

- отображение исходной сцены Pixi.js и Skia preview рядом;
- поддержка контейнеров, графики, текста, PNG sprite и вложенных трансформаций;
- учет `position`, `angle`, `scale` и `alpha` при конвертации;
- генерация случайных фигур;
- переключение подготовленного контейнера;
- `pointerDown` / `pointerUp` события для Pixi и Skia preview;
- экспорт сцены в PDF через backend.

## Локальный запуск

Установить зависимости:

```bash
npm install
```

Запустить dev-режим:

```bash
npm run dev
```

В dev-режиме приложение доступно на:

```text
http://localhost:5173
```

Backend API запускается на:

```text
http://localhost:4174
```

## Production запуск

Собрать frontend:

```bash
npm run build
```

Запустить Express server, который раздает `dist` и API:

```bash
npm run serve
```

После этого приложение доступно на:

```text
http://localhost:4174
```

## Деплой

Для Render Web Service:

```text
Build Command: npm ci && npm run build
Start Command: npm run serve
```

Сервер использует переменную окружения `PORT`, если она задана хостингом.

## Структура

- `src/shared/scene-model.ts` - типы сцены и графических команд.
- `src/shared/sample-scene.ts` - стартовая сцена и PNG sprite.
- `src/client/pixi-bridge.ts` - создание Pixi-объектов и конвертация `PIXI.Container` в Skia-модель.
- `src/client/hit-test.ts` - hit testing для событий на Skia preview.
- `src/server/skia-renderer.ts` - рендер PNG/PDF через `skia-canvas`.
- `src/server/server.ts` - Express API и раздача production build.

PDF экспорт не сохраняет сцену как один скриншот. Графические команды отрисовываются заново на Skia canvas, поэтому фигуры и линии попадают в PDF как векторные операции. PNG sprite остается растровым элементом внутри PDF.
