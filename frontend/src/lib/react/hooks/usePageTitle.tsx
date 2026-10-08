import { useEffect } from 'react'
import { useLoc } from '../../../strings/loc.ts'

export function usePageTitle(pageTitle?: string) {
  const loc = useLoc()
  const title = pageTitle ?? `${loc('Erundopel')} - ${loc('The Game')}`

  useEffect(() => {
    document.title = title
  }, [title])
}
