import React from 'react';
import { BLACK_SUSTAINABILITY_NETWORK_COMMUNITY_URL } from '@/lib/mapSupportConfig';

export default function ProfilePhotoEditor({ photoUrl }: { photoUrl: string }) {
  return <section className="rounded-lg border border-gray-200 p-3 space-y-3" aria-label="Profile photo">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Profile photo</p>
    {photoUrl && <img src={photoUrl} alt="Current profile photo" className="w-24 h-24 rounded-md bg-gray-100 object-contain" />}
    <p className="text-sm text-gray-700">Change your photo in Mighty Networks. Open your profile menu, then choose Personal Settings → Edit Profile.</p>
    <a href={BLACK_SUSTAINABILITY_NETWORK_COMMUNITY_URL} target="_blank" rel="noopener noreferrer"
      className="inline-flex rounded-md bg-green-600 text-white px-4 py-2 text-sm font-semibold">
      Open Mighty Networks
    </a>
    <p className="text-xs text-gray-600">Your new photo will appear on this map after your profile syncs.</p>
  </section>;
}
