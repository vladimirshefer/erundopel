import { useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'
import { Md5 } from 'ts-md5'
import playerProfileRepository from '../repositories/PlayerProfileRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function ProfilePreview() {
  const loc = useLoc()
  const [name, setName] = useState(
    () => playerProfileRepository.getProfile()?.name ?? '',
  )
  const [isEditing, setIsEditing] = useState(false)

  function saveName(value: string) {
    const profileName = value.trim()
    setIsEditing(false)
    if (!profileName || profileName === name) return
    playerProfileRepository.saveProfile({ name: profileName })
    setName(profileName)
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-2.5">
      <img
        alt="Player Avatar"
        className="size-11 shrink-0 rounded-full object-cover"
        src={`https://gravatar.com/avatar/${Md5.hashStr(name || 'profile')}?d=robohash&s=88`}
      />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-xs font-bold text-zinc-500">{loc('You are')}</p>
        {isEditing ? (
          <input
            autoFocus
            className="w-full border-0 bg-transparent p-0 text-lg font-black leading-tight text-zinc-950 outline-none"
            defaultValue={name}
            onBlur={(event) => saveName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') setIsEditing(false)
            }}
          />
        ) : (
          <h2 className="flex items-center gap-1.5 truncate text-lg font-black leading-tight text-zinc-950">
            <span className="truncate">{name || loc('Guest')}</span>
            <button
              aria-label={loc('Edit profile')}
              className="shrink-0 text-zinc-400 transition hover:text-zinc-950"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <FiEdit2 size={15} />
            </button>
          </h2>
        )}
      </div>
    </div>
  )
}
