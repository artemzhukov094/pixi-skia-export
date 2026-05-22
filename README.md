# Pixi to Skia PDF Export

TypeScript-приложение по тестовому заданию: сцена создается как `PIXI.Container`, конвертируется в нормализованную Skia-модель, рендерится рядом с исходным Pixi canvas и экспортируется в векторный PDF через Skia backend.

## План реализации

1. Создать Vite + TypeScript проект и серверную часть на Express.
2. Описать сериализуемую модель сцены: контейнеры, графика, PNG sprite, текст, трансформации.
3. Сделать Pixi-обертку, которая строит `PIXI.DisplayObject` и сохраняет команды для Skia-конвертера.
4. Реализовать обход `PIXI.Container` с учетом `position`, `angle`, `scale`, `alpha`.
5. Добавить UI: генерация случайной фигуры, переключение подготовленного контейнера, экспорт PDF.
6. Добавить `pointerDown` / `pointerUp` для Pixi и Skia-превью.
7. Реализовать серверный Skia-render: PNG для превью и PDF для экспорта.

## Команды

```bash
npm install
npm run build
npm run serve
```

После `npm run serve` приложение доступно на:

```text
http://localhost:4174
```

Для разработки можно использовать:

```bash
npm run dev
```

## Архитектура

- `src/shared/scene-model.ts` - общие типы сцены и графических команд.
- `src/shared/sample-scene.ts` - пример контейнера из задания.
- `src/client/pixi-bridge.ts` - создание Pixi-объектов и конвертация `PIXI.Container` в Skia-модель.
- `src/client/hit-test.ts` - hit testing для событий на Skia-превью.
- `src/server/skia-renderer.ts` - Skia-backed рендер PNG/PDF через `skia-canvas`.
- `src/server/server.ts` - Express API и раздача production build.

PDF экспорт не вставляет скриншот сцены как одну картинку: графические команды отрисовываются заново на Skia canvas, поэтому фигуры и линии попадают в PDF как векторные операции. PNG sprite остается растровым элементом внутри PDF, что соответствует природе `PIXI.Sprite`.
