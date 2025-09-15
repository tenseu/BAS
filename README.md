# Drone Controller

Веб-контроллер для управления дроном через Bluetooth.

## Требования

- Node.js 16+
- Современный браузер с поддержкой Web Bluetooth API (Chrome или Edge)
- Bluetooth адаптер

## Установка

```bash
npm install
```

## Разработка

```bash
npm run dev
```

## Сборка

```bash
npm run build
```

## Деплой на GitHub Pages

1. Создайте репозиторий на GitHub
2. Настройте GitHub Pages в настройках репозитория:
   - Source: Deploy from a branch
   - Branch: gh-pages
3. Закоммитьте и запушьте изменения:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```
4. GitHub Actions автоматически соберет и задеплоит приложение

## Использование

1. Откройте [https://your-username.github.io/drone-controller/](https://your-username.github.io/drone-controller/)
2. Нажмите "Подключиться" для инициализации Bluetooth
3. Выберите устройство "DroneController" в списке
4. Используйте виртуальные джойстики для управления:
   - Левый джойстик: движение вперед/назад и влево/вправо
   - Правый джойстик: поворот и подъем/спуск
   - Кнопки: взлет, посадка, аварийная остановка, переключение режимов

## Технологии

- Vue 3
- TypeScript
- Quasar Framework
- Web Bluetooth API

## Управление

- **Левый джойстик**: Управление высотой и поворотом
- **Правый джойстик**: Управление наклоном и движением
- **Кнопки**:
  - Взлет: Подъем дрона
  - Посадка: Плавная посадка
  - Стоп: Аварийная остановка
  - Режим: Переключение режимов полета

## Лицензия

MIT

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
