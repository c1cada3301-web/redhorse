import { ListFilter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useT } from '@/state/settings'
import {
  DEFAULT_FILTERS,
  countActive,
  type ContainerFilterState,
  type FilterOptions,
  type HealthFilter,
} from './filters'

const HEALTH: { key: HealthFilter; labelKey: string }[] = [
  { key: 'any', labelKey: 'filters.anyNeuter' },
  { key: 'healthy', labelKey: 'filters.health.healthy' },
  { key: 'unhealthy', labelKey: 'filters.health.unhealthy' },
  { key: 'starting', labelKey: 'filters.health.starting' },
  { key: 'none', labelKey: 'filters.health.none' },
]

/**
 * Меню отбора. Сортировки здесь намеренно нет: она живёт в заголовках колонок,
 * где на неё смотрят. Два места для одного и того же расходятся при первой же правке.
 */

/** «Любой» в Select — отдельное значение: пустая строка Radix'ом не принимается. */
const ANY = '__any__'

interface FilterMenuProps {
  value: ContainerFilterState
  onChange: (next: ContainerFilterState) => void
  options: FilterOptions
}

export function FilterMenu({ value, onChange, options }: FilterMenuProps) {
  const t = useT()
  const active = countActive(value)
  const patch = (part: Partial<ContainerFilterState>) => onChange({ ...value, ...part })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={active > 0 ? 'default' : 'outline'} size="default">
          <ListFilter />
          {t('filters.button')}
          {active > 0 && (
            <span className="rounded bg-black/20 px-1 font-mono text-2xs">{active}</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-68">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-2xs tracking-wider text-muted-foreground uppercase">{t('filters.title')}</span>
          {active > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ ...DEFAULT_FILTERS, sort: value.sort, desc: value.desc })}
            >
              <X />
              {t('common.reset')}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <FilterSelect
            label={t('filters.stack')}
            value={value.stack}
            options={options.stacks}
            emptyLabel={t('filters.anyMale')}
            onChange={(next) => patch({ stack: next })}
          />
          <FilterSelect
            label={t('filters.image')}
            value={value.image}
            options={options.images}
            emptyLabel={t('filters.anyMale')}
            onChange={(next) => patch({ image: next })}
          />
          <FilterSelect
            label={t('filters.network')}
            value={value.network}
            options={options.networks}
            emptyLabel={t('filters.anyFemale')}
            onChange={(next) => patch({ network: next })}
          />

          <div className="flex flex-col gap-1.5">
            <Label>{t('filters.health')}</Label>
            <Select value={value.health} onValueChange={(next) => patch({ health: next as HealthFilter })}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEALTH.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {t(item.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Label className="cursor-pointer gap-2 text-sm text-foreground/75">
            <Checkbox
              checked={value.publishedOnly}
              onCheckedChange={(checked) => patch({ publishedOnly: checked === true })}
            />
            {t('filters.publishedOnly')}
          </Label>
        </div>

      </PopoverContent>
    </Popover>
  )
}

interface FilterSelectProps {
  label: string
  value: string | null
  options: string[]
  emptyLabel: string
  onChange: (next: string | null) => void
}

function FilterSelect({ label, value, options, emptyLabel, onChange }: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={value ?? ANY} onValueChange={(raw) => onChange(raw === ANY ? null : raw)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{emptyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
