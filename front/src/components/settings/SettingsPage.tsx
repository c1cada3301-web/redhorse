import { useMemo, useState } from 'react'
import { Info, Languages, Palette, Plug, RotateCcw, ScrollText, Timer } from 'lucide-react'
import { useDiskUsage, useSystemInfo } from '../../api/queries'
import { formatBytes } from '../../lib/format'
import { LANGUAGES } from '../../lib/i18n'
import {
  LOG_BUFFER_OPTIONS,
  LOG_FONT_MAX,
  LOG_FONT_MIN,
  POLL_OPTIONS,
  THEMES,
  useSettings,
  useT,
} from '../../state/settings'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ChoiceRow, InfoRow, LanguageCard, Section, SliderRow, ToggleRow } from './controls'
import type { Choice } from './controls'

/** Пока подключение одно и жёстко зашито в бэкенд. */
const DOCKER_SOCKET = 'unix:///var/run/docker.sock'

export function SettingsPage() {
  const { settings, update, reset } = useSettings()
  const t = useT()
  const info = useSystemInfo()
  const disk = useDiskUsage()
  const [confirmReset, setConfirmReset] = useState(false)

  const bufferChoices = useMemo<Choice[]>(
    () =>
      LOG_BUFFER_OPTIONS.map((value) => ({
        value,
        label: t('settings.logs.lines', { count: value.toLocaleString(settings.language) }),
      })),
    [t, settings.language],
  )

  const pollChoices = useMemo<Choice[]>(
    () =>
      POLL_OPTIONS.map((value) => ({
        value,
        label: value === 0 ? t('settings.refresh.manual') : t('settings.refresh.seconds', { count: value / 1000 }),
      })),
    [t],
  )

  const dash = t('common.dash')
  const diskTotal =
    disk.data === undefined
      ? null
      : disk.data.images + disk.data.containers + disk.data.volumes + disk.data.buildCache

  return (
    <div className="rh-scroll h-full space-y-3 overflow-y-auto p-4">
      <Section
        title={t('settings.language.title')}
        hint={t('settings.language.hint')}
        icon={<Languages className="h-4 w-4" />}
      >
        <div className="grid gap-1.5 sm:grid-cols-2">
          {LANGUAGES.map((language) => (
            <LanguageCard
              key={language.code}
              nativeLabel={language.nativeLabel}
              label={language.label}
              active={language.code === settings.language}
              onSelect={() => update({ language: language.code })}
            />
          ))}
        </div>
      </Section>

      <Section
        title={t('settings.theme.title')}
        hint={t('settings.theme.hint')}
        icon={<Palette className="h-4 w-4" />}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEMES.map((theme) => (
            <LanguageCard
              key={theme}
              nativeLabel={t(`settings.theme.${theme}`)}
              label={theme}
              active={theme === settings.theme}
              onSelect={() => update({ theme })}
            />
          ))}
        </div>
      </Section>

      <Section
        title={t('settings.logs.title')}
        hint={t('settings.logs.hint')}
        icon={<ScrollText className="h-4 w-4" />}
      >
        <ChoiceRow
          label={t('settings.logs.buffer')}
          hint={t('settings.logs.bufferHint')}
          choices={bufferChoices}
          value={settings.logBufferSize}
          onChange={(value) => update({ logBufferSize: value })}
        />

        <SliderRow
          label={t('settings.logs.fontSize')}
          hint={t('settings.logs.fontSizeHint')}
          value={settings.logFontSize}
          valueLabel={t('settings.logs.fontSizeValue', { size: settings.logFontSize })}
          min={LOG_FONT_MIN}
          max={LOG_FONT_MAX}
          onChange={(value) => update({ logFontSize: value })}
        />

        <ToggleRow
          label={t('settings.logs.timestamps')}
          hint={t('settings.logs.timestampsHint')}
          checked={settings.logTimestamps}
          onChange={(value) => update({ logTimestamps: value })}
        />

        <ToggleRow
          label={t('settings.logs.mask')}
          hint={t('settings.logs.maskHint')}
          checked={settings.maskSecrets}
          onChange={(value) => update({ maskSecrets: value })}
        />
      </Section>

      <Section
        title={t('settings.refresh.title')}
        hint={t('settings.refresh.hint')}
        icon={<Timer className="h-4 w-4" />}
      >
        <ChoiceRow
          label={t('settings.refresh.poll')}
          hint={settings.pollInterval === 0 ? t('settings.refresh.manualHint') : t('settings.refresh.hint')}
          choices={pollChoices}
          value={settings.pollInterval}
          onChange={(value) => update({ pollInterval: value })}
        />
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section
          title={t('settings.connection.title')}
          hint={t('settings.connection.hint')}
          icon={<Plug className="h-4 w-4" />}
        >
          <InfoRow label={t('settings.connection.socket')} value={DOCKER_SOCKET} />
          <InfoRow
            label={t('settings.connection.version')}
            value={info.data?.serverVersion ?? (info.isPending ? t('common.loading') : dash)}
          />
          <p className="px-1 pt-0.5 text-[11px] text-fg/25">{t('settings.connection.remoteSoon')}</p>
        </Section>

        <Section title={t('settings.about.title')} icon={<Info className="h-4 w-4" />}>
          <InfoRow label={t('settings.about.host')} value={info.data?.name ?? dash} />
          <InfoRow label={t('settings.about.os')} value={info.data?.operatingSystem ?? dash} />
          <InfoRow label={t('settings.about.arch')} value={info.data?.architecture ?? dash} />
          <InfoRow
            label={t('settings.about.cpus')}
            value={info.data === undefined ? dash : String(info.data.cpus)}
          />
          <InfoRow
            label={t('settings.about.memory')}
            value={info.data === undefined ? dash : formatBytes(info.data.memory)}
          />
          <InfoRow
            label={t('settings.about.containers')}
            value={
              info.data === undefined
                ? dash
                : t('settings.about.containersValue', {
                    total: info.data.containers,
                    running: info.data.containersRunning,
                  })
            }
          />
          <InfoRow
            label={t('settings.about.images')}
            value={info.data === undefined ? dash : String(info.data.images)}
          />
          <InfoRow
            label={t('settings.about.disk')}
            value={diskTotal === null ? (disk.isPending ? t('common.loading') : dash) : formatBytes(diskTotal)}
          />
        </Section>
      </div>

      <Section
        title={t('settings.reset.title')}
        hint={t('settings.reset.hint')}
        icon={<RotateCcw className="h-4 w-4" />}
      >
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 text-[12px] text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/20"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('settings.reset.action')}
        </button>
      </Section>

      <ConfirmDialog
        open={confirmReset}
        title={t('settings.reset.confirmTitle')}
        description={t('settings.reset.confirmText')}
        confirmLabel={t('settings.reset.confirmAction')}
        onConfirm={reset}
        onOpenChange={setConfirmReset}
      />
    </div>
  )
}
