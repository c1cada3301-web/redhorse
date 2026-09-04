import { useState } from 'react'
import { Loader2, Rocket } from 'lucide-react'
import { useCreateContainer } from '@/api/queries'
import type {
  CreateContainerRequest,
  DeviceBinding,
  PortBinding,
  RestartPolicyName,
  VolumeBinding,
} from '@/api/types'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useT } from '@/state/settings'
import { Field, RowList } from './rows'
import { ImagePicker } from './ImagePicker'
import { CAPABILITIES, DEFAULT_ON, toCapChanges } from './capabilities'
import { Switch } from '@/components/ui/switch'

interface Pair {
  key: string
  value: string
}

interface CreateContainerPageProps {
  onCreated: (containerId: string) => void
  onCancel: () => void
}

const RESTART: RestartPolicyName[] = ['no', 'always', 'on-failure', 'unless-stopped']

/** Строки вида «ключ=значение» переводим в объект, пустые ключи отбрасываем. */
function toRecord(pairs: Pair[]): Record<string, string> {
  return Object.fromEntries(
    pairs.filter((pair) => pair.key.trim() !== '').map((pair) => [pair.key.trim(), pair.value]),
  )
}

export function CreateContainerPage({ onCreated, onCancel }: CreateContainerPageProps) {
  const t = useT()
  const create = useCreateContainer()

  const [name, setName] = useState('')
  const [image, setImage] = useState('')
  const [alwaysPull, setAlwaysPull] = useState(true)
  const [start, setStart] = useState(true)

  const [ports, setPorts] = useState<PortBinding[]>([])
  const [publishAll, setPublishAll] = useState(false)
  const [volumes, setVolumes] = useState<VolumeBinding[]>([])
  const [env, setEnv] = useState<Pair[]>([])
  const [labels, setLabels] = useState<Pair[]>([])

  const [command, setCommand] = useState('')
  const [entrypoint, setEntrypoint] = useState('')
  const [workingDir, setWorkingDir] = useState('')
  const [user, setUser] = useState('')
  const [hostname, setHostname] = useState('')
  const [network, setNetwork] = useState('')

  const [restart, setRestart] = useState<RestartPolicyName>('no')
  const [maximumRetry, setMaximumRetry] = useState('0')

  const [memoryMb, setMemoryMb] = useState('')
  const [memoryReservationMb, setMemoryReservationMb] = useState('')
  const [cpus, setCpus] = useState('')
  const [devices, setDevices] = useState<DeviceBinding[]>([])
  const [sysctls, setSysctls] = useState<Pair[]>([])
  const [shmSizeMb, setShmSizeMb] = useState('')
  const [runtime, setRuntime] = useState('')
  const [logDriver, setLogDriver] = useState('')
  const [logOptions, setLogOptions] = useState<Pair[]>([])
  const [domainname, setDomainname] = useState('')
  const [dns, setDns] = useState('')
  const [extraHosts, setExtraHosts] = useState<Pair[]>([])
  const [caps, setCaps] = useState<ReadonlySet<string>>(new Set(DEFAULT_ON))
  const [stdinOpen, setStdinOpen] = useState(false)
  const [privileged, setPrivileged] = useState(false)
  const [init, setInit] = useState(false)
  const [tty, setTty] = useState(false)
  const [autoRemove, setAutoRemove] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (image.trim() === '') {
      setError(t('create.imageRequired'))
      return
    }

    setError(null)

    const request: CreateContainerRequest = {
      name: name.trim(),
      image: image.trim(),
      alwaysPull,
      start,
      ports: ports.filter((port) => port.containerPort > 0),
      publishAll,
      volumes: volumes.filter((item) => item.source.trim() !== '' && item.target.trim() !== ''),
      env: toRecord(env),
      labels: toRecord(labels),
      command: command.trim(),
      entrypoint: entrypoint.trim(),
      workingDir: workingDir.trim(),
      user: user.trim(),
      hostname: hostname.trim(),
      network: network.trim(),
      restartPolicy: { name: restart, maximumRetry: Number(maximumRetry) || 0 },
      // Пустое поле означает «без ограничения», поэтому ноль здесь безопасен.
      memoryMb: Number(memoryMb) || 0,
      memoryReservationMb: Number(memoryReservationMb) || 0,
      cpus: Number(cpus) || 0,
      privileged,
      init,
      tty,
      stdinOpen,
      autoRemove,
      ...toCapChanges(caps),
      devices: devices.filter((device) => device.hostPath.trim() !== ''),
      sysctls: toRecord(sysctls),
      shmSizeMb: Number(shmSizeMb) || 0,
      runtime: runtime.trim(),
      logConfig: { driver: logDriver.trim(), options: toRecord(logOptions) },
      domainname: domainname.trim(),
      // Адреса перечисляются через запятую — так короче, чем строка на каждый.
      dns: dns
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== ''),
      extraHosts: toRecord(extraHosts),
    }

    create.mutate(request, {
      onSuccess: (container) => onCreated(container.id),
      onError: (cause: unknown) =>
        setError(cause instanceof ApiError ? cause.message : t('create.failed')),
    })
  }

  return (
    <div className="rh-scroll h-full overflow-y-auto p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('create.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Field label={t('create.name')}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-service" />
              </Field>
              <Field label={t('create.image')}>
                <ImagePicker value={image} onChange={setImage} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Label className="cursor-pointer text-sm text-foreground/75">
                <Checkbox checked={alwaysPull} onCheckedChange={(v) => setAlwaysPull(v === true)} />
                {t('create.alwaysPull')}
              </Label>
              <Label className="cursor-pointer text-sm text-foreground/75">
                <Checkbox checked={start} onCheckedChange={(v) => setStart(v === true)} />
                {t('create.startNow')}
              </Label>
              <Label className="cursor-pointer text-sm text-foreground/75">
                <Checkbox checked={publishAll} onCheckedChange={(v) => setPublishAll(v === true)} />
                {t('create.publishAll')}
              </Label>
            </div>

            <RowList
              label={t('create.ports')}
              items={ports}
              onChange={setPorts}
              empty={{ containerPort: 0, hostPort: null, protocol: 'tcp' }}
              addLabel={t('create.addPort')}
            >
              {(port, update) => (
                <>
                  <Input
                    type="number"
                    value={port.hostPort ?? ''}
                    onChange={(e) => update({ hostPort: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder={t('create.hostPort')}
                    className="font-mono"
                  />
                  <span className="text-muted-foreground">→</span>
                  <Input
                    type="number"
                    value={port.containerPort || ''}
                    onChange={(e) => update({ containerPort: Number(e.target.value) })}
                    placeholder={t('create.containerPort')}
                    className="font-mono"
                  />
                  <Select value={port.protocol} onValueChange={(v) => update({ protocol: v as 'tcp' | 'udp' })}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tcp">tcp</SelectItem>
                      <SelectItem value="udp">udp</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </RowList>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5">
            <Tabs defaultValue="volumes">
              <TabsList className="w-full [&>*]:flex-1">
                <TabsTrigger value="volumes">{t('create.tab.volumes')}</TabsTrigger>
                <TabsTrigger value="env">{t('create.tab.env')}</TabsTrigger>
                <TabsTrigger value="labels">{t('create.tab.labels')}</TabsTrigger>
                <TabsTrigger value="command">{t('create.tab.command')}</TabsTrigger>
                <TabsTrigger value="network">{t('create.tab.network')}</TabsTrigger>
                <TabsTrigger value="restart">{t('create.tab.restart')}</TabsTrigger>
                <TabsTrigger value="resources">{t('create.tab.resources')}</TabsTrigger>
                <TabsTrigger value="runtime">{t('create.tab.runtime')}</TabsTrigger>
                <TabsTrigger value="logging">{t('create.tab.logging')}</TabsTrigger>
                <TabsTrigger value="caps">{t('create.tab.caps')}</TabsTrigger>
              </TabsList>

              <TabsContent value="volumes" className="pt-3">
                <RowList
                  label={t('create.volumes')}
                  items={volumes}
                  onChange={setVolumes}
                  empty={{ source: '', target: '', readOnly: false }}
                  addLabel={t('create.addVolume')}
                >
                  {(item, update) => (
                    <>
                      <Input
                        value={item.source}
                        onChange={(e) => update({ source: e.target.value })}
                        placeholder={t('create.volumeSource')}
                        className="font-mono"
                      />
                      <span className="text-muted-foreground">→</span>
                      <Input
                        value={item.target}
                        onChange={(e) => update({ target: e.target.value })}
                        placeholder="/data"
                        className="font-mono"
                      />
                      <Label className="cursor-pointer whitespace-nowrap text-xs">
                        <Checkbox
                          checked={item.readOnly === true}
                          onCheckedChange={(v) => update({ readOnly: v === true })}
                        />
                        ro
                      </Label>
                    </>
                  )}
                </RowList>
              </TabsContent>

              <TabsContent value="env" className="pt-3">
                <PairRows label={t('create.env')} items={env} onChange={setEnv} addLabel={t('create.addEnv')} />
              </TabsContent>

              <TabsContent value="labels" className="pt-3">
                <PairRows
                  label={t('create.labels')}
                  items={labels}
                  onChange={setLabels}
                  addLabel={t('create.addLabel')}
                />
              </TabsContent>

              <TabsContent value="command" className="flex flex-col gap-3 pt-3">
                <Field label={t('create.command')}>
                  <Input
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="nginx -g 'daemon off;'"
                    className="font-mono"
                  />
                </Field>
                <Field label={t('create.entrypoint')}>
                  <Input
                    value={entrypoint}
                    onChange={(e) => setEntrypoint(e.target.value)}
                    placeholder="/bin/sh -c"
                    className="font-mono"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('create.workingDir')}>
                    <Input value={workingDir} onChange={(e) => setWorkingDir(e.target.value)} placeholder="/app" />
                  </Field>
                  <Field label={t('create.user')}>
                    <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="nginx" />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <Label className="cursor-pointer text-sm text-foreground/75">
                    <Checkbox checked={tty} onCheckedChange={(v) => setTty(v === true)} />
                    {t('create.tty')}
                  </Label>
                  <Label className="cursor-pointer text-sm text-foreground/75">
                    <Checkbox checked={stdinOpen} onCheckedChange={(v) => setStdinOpen(v === true)} />
                    {t('create.stdinOpen')}
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="network" className="flex flex-col gap-3 pt-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={t('create.network')}>
                    <Input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="bridge" />
                  </Field>
                  <Field label={t('create.hostname')}>
                    <Input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="web01" />
                  </Field>
                  <Field label={t('create.domain')}>
                    <Input
                      value={domainname}
                      onChange={(e) => setDomainname(e.target.value)}
                      placeholder="example.com"
                    />
                  </Field>
                </div>
                <Field label={t('create.dns')}>
                  <Input
                    value={dns}
                    onChange={(e) => setDns(e.target.value)}
                    placeholder="1.1.1.1, 8.8.8.8"
                    className="font-mono"
                  />
                </Field>
                <PairRows
                  label={t('create.extraHosts')}
                  items={extraHosts}
                  onChange={setExtraHosts}
                  addLabel={t('create.addHost')}
                />
              </TabsContent>

              <TabsContent value="restart" className="grid gap-3 pt-3 sm:grid-cols-2">
                <Field label={t('create.restartPolicy')}>
                  <Select value={restart} onValueChange={(v) => setRestart(v as RestartPolicyName)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESTART.map((policy) => (
                        <SelectItem key={policy} value={policy}>
                          {t(`create.restart.${policy}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {restart === 'on-failure' && (
                  <Field label={t('create.maxRetry')}>
                    <Input
                      type="number"
                      value={maximumRetry}
                      onChange={(e) => setMaximumRetry(e.target.value)}
                      className="font-mono"
                    />
                  </Field>
                )}
                <Label className="cursor-pointer text-sm text-foreground/75">
                  <Checkbox checked={autoRemove} onCheckedChange={(v) => setAutoRemove(v === true)} />
                  {t('create.autoRemove')}
                </Label>
              </TabsContent>

              <TabsContent value="resources" className="flex flex-col gap-3 pt-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={t('create.memoryLimit')}>
                    <Input
                      type="number"
                      value={memoryMb}
                      onChange={(e) => setMemoryMb(e.target.value)}
                      placeholder={t('create.unlimited')}
                      className="font-mono"
                    />
                  </Field>
                  <Field label={t('create.memoryReservation')}>
                    <Input
                      type="number"
                      value={memoryReservationMb}
                      onChange={(e) => setMemoryReservationMb(e.target.value)}
                      placeholder={t('create.unlimited')}
                      className="font-mono"
                    />
                  </Field>
                  <Field label={t('create.cpus')}>
                    <Input
                      type="number"
                      step="0.1"
                      value={cpus}
                      onChange={(e) => setCpus(e.target.value)}
                      placeholder={t('create.unlimited')}
                      className="font-mono"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <Label className="cursor-pointer text-sm text-foreground/75">
                    <Checkbox checked={privileged} onCheckedChange={(v) => setPrivileged(v === true)} />
                    {t('create.privileged')}
                  </Label>
                  <Label className="cursor-pointer text-sm text-foreground/75">
                    <Checkbox checked={init} onCheckedChange={(v) => setInit(v === true)} />
                    {t('create.init')}
                  </Label>
                </div>
                {privileged && (
                  <p className="text-xs text-warning">{t('create.privilegedWarning')}</p>
                )}
              </TabsContent>

              <TabsContent value="runtime" className="flex flex-col gap-4 pt-3">
                <RowList
                  label={t('create.devices')}
                  items={devices}
                  onChange={setDevices}
                  empty={{ hostPath: '', containerPath: '', permissions: 'rwm' }}
                  addLabel={t('create.addDevice')}
                >
                  {(device, update) => (
                    <>
                      <Input
                        value={device.hostPath}
                        onChange={(e) => update({ hostPath: e.target.value })}
                        placeholder="/dev/ttyUSB0"
                        className="font-mono"
                      />
                      <span className="text-muted-foreground">→</span>
                      <Input
                        value={device.containerPath ?? ''}
                        onChange={(e) => update({ containerPath: e.target.value })}
                        placeholder={t('create.sameAsHost')}
                        className="font-mono"
                      />
                      <Input
                        value={device.permissions}
                        onChange={(e) => update({ permissions: e.target.value })}
                        className="w-20 font-mono"
                      />
                    </>
                  )}
                </RowList>

                <PairRows
                  label={t('create.sysctls')}
                  items={sysctls}
                  onChange={setSysctls}
                  addLabel={t('create.addSysctl')}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('create.shmSize')}>
                    <Input
                      type="number"
                      value={shmSizeMb}
                      onChange={(e) => setShmSizeMb(e.target.value)}
                      placeholder="64"
                      className="font-mono"
                    />
                  </Field>
                  <Field label={t('create.runtime')}>
                    <Input
                      value={runtime}
                      onChange={(e) => setRuntime(e.target.value)}
                      placeholder="runc"
                      className="font-mono"
                    />
                  </Field>
                </div>
              </TabsContent>

              <TabsContent value="logging" className="flex flex-col gap-3 pt-3">
                <Field label={t('create.logDriver')}>
                  <Input
                    value={logDriver}
                    onChange={(e) => setLogDriver(e.target.value)}
                    placeholder={t('create.logDriverDefault')}
                    className="font-mono"
                  />
                </Field>
                <PairRows
                  label={t('create.logOptions')}
                  items={logOptions}
                  onChange={setLogOptions}
                  addLabel={t('create.addLogOption')}
                />
              </TabsContent>

              <TabsContent value="caps" className="pt-3">
                <p className="mb-3 text-xs text-muted-foreground">{t('create.capsHint')}</p>
                <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {CAPABILITIES.map((capability) => (
                    <label
                      key={capability}
                      className="flex cursor-pointer items-center justify-between gap-3 py-0.5"
                    >
                      <span className="font-mono text-xs text-foreground/80">{capability}</span>
                      <Switch
                        checked={caps.has(capability)}
                        onCheckedChange={(on) => {
                          setCaps((current) => {
                            const next = new Set(current)
                            if (on) next.add(capability)
                            else next.delete(capability)
                            return next
                          })
                        }}
                      />
                    </label>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {error !== null && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 pb-4">
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Rocket />}
            {t('create.submit')}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function PairRows({
  label,
  items,
  onChange,
  addLabel,
}: {
  label: string
  items: Pair[]
  onChange: (items: Pair[]) => void
  addLabel: string
}) {
  return (
    <RowList label={label} items={items} onChange={onChange} empty={{ key: '', value: '' }} addLabel={addLabel}>
      {(pair, update) => (
        <>
          <Input
            value={pair.key}
            onChange={(e) => update({ key: e.target.value })}
            placeholder="KEY"
            className="font-mono"
          />
          <span className="text-muted-foreground">=</span>
          <Input
            value={pair.value}
            onChange={(e) => update({ value: e.target.value })}
            placeholder="value"
            className="font-mono"
          />
        </>
      )}
    </RowList>
  )
}
