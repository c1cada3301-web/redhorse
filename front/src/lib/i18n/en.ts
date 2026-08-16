import type { Dictionary } from './types'

/** English dictionary — must repeat exactly the key set of `ru`. */
export const en: Dictionary = {
  // Navigation
  'nav.dashboard': 'Overview',
  'nav.containers': 'Containers',
  'nav.images': 'Images',
  'nav.volumes': 'Volumes',
  'nav.networks': 'Networks',
  'nav.monitoring': 'Monitoring',
  'nav.cleanup': 'Cleanup',
  'nav.settings': 'Settings',
  'nav.soon': 'soon',
  'nav.tagline': 'docker control',
  'nav.collapse': 'Collapse menu',
  'nav.expand': 'Expand menu',
  'nav.socket': 'local · unix socket',
  'nav.runningOf': '{running}/{total} containers running',

  // Page headers
  'page.dashboard.title': 'Overview',
  'page.dashboard.subtitle': 'Host and stack summary',
  'page.containers.title': 'Containers',
  'page.containers.subtitle': 'Local Docker Engine · unix:///var/run/docker.sock',
  'page.images.title': 'Images',
  'page.images.subtitle': 'Builds, tags, layers and sizes',
  'page.volumes.title': 'Volumes',
  'page.volumes.subtitle': 'Storage and mount points',
  'page.networks.title': 'Networks',
  'page.networks.subtitle': 'Bridge, overlay and attached containers',
  'page.monitoring.title': 'Monitoring',
  'page.monitoring.subtitle': 'CPU, memory, disk and network per container',
  'page.cleanup.title': 'Cleanup',
  'page.cleanup.subtitle': 'Prune, retention policies and timers',
  'page.settings.title': 'Settings',
  'page.settings.subtitle': 'Hosts, access, appearance',

  // Common words
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.apply': 'Apply',
  'common.close': 'Close',
  'common.refresh': 'Refresh',
  'common.save': 'Save',
  'common.reset': 'Reset',
  'common.confirm': 'Confirm',
  'common.loading': 'Loading…',
  'common.error': 'Error',
  'common.empty': 'Nothing found',
  'common.noData': 'No data',
  'common.all': 'All',
  'common.search': 'Search',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.on': 'On',
  'common.off': 'Off',
  'common.unknown': 'Unknown',
  'common.soon': 'Soon',
  'common.dash': '—',

  // Settings: language
  'settings.language.title': 'Interface language',
  'settings.language.hint': 'Applied instantly, no page reload needed.',

  // Settings: logs
  'settings.logs.title': 'Logs',
  'settings.logs.hint': 'Defaults for newly opened log windows.',
  'settings.logs.buffer': 'Buffer size',
  'settings.logs.bufferHint': 'How many lines to keep in memory per session.',
  'settings.logs.lines': '{count} lines',
  'settings.logs.fontSize': 'Font size',
  'settings.logs.fontSizeHint': 'Monospace text size in the log window.',
  'settings.logs.fontSizeValue': '{size} px',
  'settings.logs.timestamps': 'Timestamps',
  'settings.logs.timestampsHint': 'Show the time of every line.',
  'settings.logs.mask': 'Hide secrets',
  'settings.logs.maskHint': 'Mask tokens and passwords in the output.',

  // Settings: data refresh
  'settings.refresh.title': 'Data refresh',
  'settings.refresh.hint': 'How often to re-read the container list.',
  'settings.refresh.poll': 'Polling interval',
  'settings.refresh.seconds': '{count} s',
  'settings.refresh.manual': 'Manual',
  'settings.refresh.manualHint': 'Refresh only via the button in the top bar.',

  // Settings: connection
  'settings.connection.title': 'Connection',
  'settings.connection.hint': 'Only the local Docker socket is supported for now.',
  'settings.connection.socket': 'Docker socket',
  'settings.connection.version': 'Server version',
  'settings.connection.remoteSoon': 'Remote hosts over TLS and SSH are coming later.',

  // Settings: about
  'settings.about.title': 'About the system',
  'settings.about.host': 'Host',
  'settings.about.os': 'OS',
  'settings.about.arch': 'Architecture',
  'settings.about.cpus': 'CPU cores',
  'settings.about.memory': 'Memory',
  'settings.about.containers': 'Containers',
  'settings.about.containersValue': '{total} total · {running} running',
  'settings.about.images': 'Images',
  'settings.about.disk': 'Disk used',

  // Settings: reset
  'settings.reset.title': 'Reset',
  'settings.reset.hint': 'Return every option to its default value.',
  'settings.reset.action': 'Reset settings',
  'settings.reset.confirmTitle': 'Reset settings?',
  'settings.reset.confirmText': 'All options return to their defaults, including the interface language.',
  'settings.reset.confirmAction': 'Reset',
}
