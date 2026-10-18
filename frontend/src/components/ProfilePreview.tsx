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
    <div className="flex flex-col items-center text-center">
      <p className="text-sm font-bold text-zinc-600">{loc('You are')}</p>
      {isEditing ? (
        <input
          autoFocus
          className="mt-1 w-full border-0 bg-transparent text-center text-3xl font-black tracking-tight text-zinc-950 outline-none sm:text-4xl"
          defaultValue={name}
          onBlur={(event) => saveName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setIsEditing(false)
          }}
        />
      ) : (
        <h2 className="flex items-center gap-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
          {name || loc('Guest')}
          <button
            aria-label={loc('Edit profile')}
            className="text-zinc-400 transition hover:text-zinc-950"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            <FiEdit2 size={18} />
          </button>
        </h2>
      )}
      <img
        alt="Player Avatar"
        className="size-70 border-zinc-950 bg-white object-cover"
        src={`https://gravatar.com/avatar/${Md5.hashStr(name || 'profile')}?d=robohash&s=300`}
      />
    </div>
  )
}
