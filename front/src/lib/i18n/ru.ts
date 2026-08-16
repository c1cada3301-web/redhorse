import type { Dictionary } from './types'

/** Русский словарь — источник правды: любой новый ключ добавляется сначала сюда. */
export const ru: Dictionary = {
  // Навигация
  'nav.dashboard': 'Обзор',
  'nav.containers': 'Контейнеры',
  'nav.images': 'Образы',
  'nav.volumes': 'Тома',
  'nav.networks': 'Сети',
  'nav.monitoring': 'Мониторинг',
  'nav.cleanup': 'Очистка',
  'nav.settings': 'Настройки',
  'nav.soon': 'скоро',
  'nav.tagline': 'docker control',
  'nav.socket': 'local · unix socket',
  'nav.runningOf': '{running}/{total} контейнеров запущено',

  // Заголовки страниц
  'page.dashboard.title': 'Обзор',
  'page.dashboard.subtitle': 'Сводка по хосту и стекам',
  'page.containers.title': 'Контейнеры',
  'page.containers.subtitle': 'Локальный Docker Engine · unix:///var/run/docker.sock',
  'page.images.title': 'Образы',
  'page.images.subtitle': 'Сборка, теги, слои и размеры',
  'page.volumes.title': 'Тома',
  'page.volumes.subtitle': 'Хранилище и точки монтирования',
  'page.networks.title': 'Сети',
  'page.networks.subtitle': 'Bridge, overlay и подключённые контейнеры',
  'page.monitoring.title': 'Мониторинг',
  'page.monitoring.subtitle': 'CPU, память, диск и сеть по контейнерам',
  'page.cleanup.title': 'Очистка',
  'page.cleanup.subtitle': 'Prune, политики хранения и таймеры',
  'page.settings.title': 'Настройки',
  'page.settings.subtitle': 'Хосты, доступ, внешний вид',

  // Общие слова
  'common.cancel': 'Отмена',
  'common.delete': 'Удалить',
  'common.apply': 'Применить',
  'common.close': 'Закрыть',
  'common.refresh': 'Обновить',
  'common.save': 'Сохранить',
  'common.reset': 'Сбросить',
  'common.confirm': 'Подтвердить',
  'common.loading': 'Загрузка…',
  'common.error': 'Ошибка',
  'common.empty': 'Ничего не найдено',
  'common.noData': 'Нет данных',
  'common.all': 'Все',
  'common.search': 'Поиск',
  'common.yes': 'Да',
  'common.no': 'Нет',
  'common.on': 'Вкл',
  'common.off': 'Выкл',
  'common.unknown': 'Неизвестно',
  'common.soon': 'Скоро',
  'common.dash': '—',

  // Настройки: язык
  'settings.language.title': 'Язык интерфейса',
  'settings.language.hint': 'Применяется сразу, без перезагрузки страницы.',

  // Настройки: логи
  'settings.logs.title': 'Логи',
  'settings.logs.hint': 'Значения по умолчанию для новых окон логов.',
  'settings.logs.buffer': 'Размер буфера',
  'settings.logs.bufferHint': 'Сколько строк держать в памяти на одну сессию.',
  'settings.logs.lines': '{count} строк',
  'settings.logs.fontSize': 'Размер шрифта',
  'settings.logs.fontSizeHint': 'Кегль моноширинного текста в окне логов.',
  'settings.logs.fontSizeValue': '{size} px',
  'settings.logs.timestamps': 'Метки времени',
  'settings.logs.timestampsHint': 'Показывать время каждой строки.',
  'settings.logs.mask': 'Прятать секреты',
  'settings.logs.maskHint': 'Маскировать токены и пароли в выводе.',

  // Настройки: обновление данных
  'settings.refresh.title': 'Обновление данных',
  'settings.refresh.hint': 'Как часто перечитывать список контейнеров.',
  'settings.refresh.poll': 'Период опроса',
  'settings.refresh.seconds': '{count} с',
  'settings.refresh.manual': 'Вручную',
  'settings.refresh.manualHint': 'Обновление только по кнопке в верхней панели.',

  // Настройки: подключение
  'settings.connection.title': 'Подключение',
  'settings.connection.hint': 'Пока поддерживается только локальный Docker-сокет.',
  'settings.connection.socket': 'Docker-сокет',
  'settings.connection.version': 'Версия сервера',
  'settings.connection.remoteSoon': 'Удалённые хосты по TLS и SSH появятся позже.',

  // Настройки: о системе
  'settings.about.title': 'О системе',
  'settings.about.host': 'Хост',
  'settings.about.os': 'ОС',
  'settings.about.arch': 'Архитектура',
  'settings.about.cpus': 'Ядра',
  'settings.about.memory': 'Память',
  'settings.about.containers': 'Контейнеры',
  'settings.about.containersValue': '{total} всего · {running} запущено',
  'settings.about.images': 'Образы',
  'settings.about.disk': 'Занято на диске',

  // Настройки: сброс
  'settings.reset.title': 'Сброс',
  'settings.reset.hint': 'Вернуть все параметры к значениям по умолчанию.',
  'settings.reset.action': 'Сбросить настройки',
  'settings.reset.confirmTitle': 'Сбросить настройки?',
  'settings.reset.confirmText': 'Все параметры вернутся к значениям по умолчанию, включая язык интерфейса.',
  'settings.reset.confirmAction': 'Сбросить',
}
