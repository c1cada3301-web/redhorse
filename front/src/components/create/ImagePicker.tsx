import { useEffect, useState } from 'react'
import { Loader2, Search, Star } from 'lucide-react'
import { useHubSearch, useHubTags } from '@/api/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useT } from '@/state/settings'

interface ImagePickerProps {
  value: string
  onChange: (image: string) => void
}

/**
 * Поле образа с поиском по Docker Hub.
 *
 * Имя можно ввести руками — это по-прежнему обычное поле. Поиск и список тегов
 * нужны, когда точное имя неизвестно: тегов демон не знает вовсе, их отдаёт Hub.
 */
export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')

  // Пауза перед запросом: иначе поиск уходит на каждую букву.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term), 350)
    return () => window.clearTimeout(timer)
  }, [term])

  const search = useHubSearch(debounced)
  const repository = value.split(':')[0]
  const tags = useHubTags(repository)

  const pick = (name: string) => {
    onChange(name)
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="nginx:alpine"
        spellCheck={false}
        className="font-mono"
      />

      {/* Теги показываем, только когда репозиторий уже назван. */}
      {tags.data !== undefined && tags.data.length > 0 && (
        <Select value={value.includes(':') ? value.split(':')[1] : ''} onValueChange={(tag) => onChange(`${repository}:${tag}`)}>
          <SelectTrigger className="w-40 shrink-0">
            <SelectValue placeholder={t('create.tag')} />
          </SelectTrigger>
          <SelectContent>
            {tags.data.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="shrink-0">
            <Search />
            {t('create.searchHub')}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[420px] p-2" align="end">
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t('create.searchHubPlaceholder')}
            autoFocus
            className="mb-2"
          />

          {search.isFetching && (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t('create.searching')}
            </div>
          )}

          {search.isError && (
            <p className="px-2 py-3 text-sm text-destructive">{t('create.searchFailed')}</p>
          )}

          {search.data !== undefined && search.data.length === 0 && !search.isFetching && (
            <p className="px-2 py-3 text-sm text-muted-foreground">{t('common.empty')}</p>
          )}

          <div className="rh-scroll max-h-72 overflow-y-auto">
            {search.data?.map((image) => (
              <button
                key={image.name}
                type="button"
                onClick={() => pick(image.name)}
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-mono text-sm text-foreground">{image.name}</span>
                    {image.official && (
                      <span className="shrink-0 rounded bg-primary/14 px-1 text-2xs text-primary">
                        {t('create.official')}
                      </span>
                    )}
                  </div>
                  {image.description !== '' && (
                    <p className="truncate text-xs text-muted-foreground">{image.description}</p>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-1 pt-0.5 font-mono text-2xs text-muted-foreground">
                  <Star className="size-3" />
                  {image.stars}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
