import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLoc } from '../strings/loc.ts'

export default function LobbyLoadingPage() {
  const loc = useLoc()
  const navigate = useNavigate()
  const { code } = useParams()
  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true })
      return
    }

    const timeout = window.setTimeout(() => navigate(`/lobby/${code}/room`, { replace: true }), 350)
    return () => window.clearTimeout(timeout)
  }, [code, navigate])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-amber-300 p-8 text-center">
      <div className="size-12 animate-spin rounded-full border-4 border-zinc-950 border-t-white" />
      <h1 className="text-3xl font-black text-zinc-950">{loc('Loading lobby')}</h1>
      <p className="font-semibold text-zinc-700">{code}</p>
    </main>
  )
}
