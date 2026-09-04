/**
 * Список привилегий ядра, который показывает Portainer.
 *
 * DEFAULT_ON — те, что Docker выдаёт контейнеру сам. Разница между этим набором
 * и выбором пользователя и превращается в cap_add и cap_drop: включённая сверх
 * умолчания уходит в add, выключенная из умолчания — в drop.
 */
export const CAPABILITIES = [
  'AUDIT_CONTROL', 'AUDIT_WRITE', 'BLOCK_SUSPEND',
  'CHOWN', 'DAC_OVERRIDE', 'DAC_READ_SEARCH',
  'FOWNER', 'FSETID', 'IPC_LOCK',
  'IPC_OWNER', 'KILL', 'LEASE',
  'LINUX_IMMUTABLE', 'MAC_ADMIN', 'MAC_OVERRIDE',
  'MKNOD', 'NET_ADMIN', 'NET_BIND_SERVICE',
  'NET_BROADCAST', 'NET_RAW', 'SETFCAP',
  'SETGID', 'SETPCAP', 'SETUID',
  'SYSLOG', 'SYS_ADMIN', 'SYS_BOOT',
  'SYS_CHROOT', 'SYS_MODULE', 'SYS_NICE',
  'SYS_PACCT', 'SYS_PTRACE', 'SYS_RAWIO',
  'SYS_RESOURCE', 'SYS_TIME', 'SYS_TTY_CONFIG',
  'WAKE_ALARM',
] as const

export const DEFAULT_ON = new Set([
  'AUDIT_WRITE', 'CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'FSETID', 'KILL', 'MKNOD',
  'NET_BIND_SERVICE', 'NET_RAW', 'SETFCAP', 'SETGID', 'SETPCAP', 'SETUID', 'SYS_CHROOT',
])

/** Из отмеченных галочек собираем то, что понимает Docker: добавить и отнять. */
export function toCapChanges(enabled: ReadonlySet<string>): { capAdd: string[]; capDrop: string[] } {
  const capAdd: string[] = []
  const capDrop: string[] = []

  for (const name of CAPABILITIES) {
    const on = enabled.has(name)
    if (on && !DEFAULT_ON.has(name)) capAdd.push(name)
    if (!on && DEFAULT_ON.has(name)) capDrop.push(name)
  }

  return { capAdd, capDrop }
}
