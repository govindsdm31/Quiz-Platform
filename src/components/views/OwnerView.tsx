/**
 * Owner View - Manages collaboration spaces and administrators
 */

import { useState } from 'react';
import { Settings, Users, Plus } from 'lucide-react';
import type { CollabSpace, Administrator } from '../../types';

interface OwnerViewProps {
  collabSpaces: CollabSpace[];
  administrators: Administrator[];
  createCollabSpace: (name: string) => void;
  toggleCollabSpace: (id: string) => void;
  createAdministrator: (username: string, password: string, spaceId: string, label?: string, address?: string, logoUrl?: string) => void;
  toggleAdministrator: (id: string) => void;
}

export function OwnerView({
  collabSpaces,
  administrators,
  createCollabSpace,
  toggleCollabSpace,
  createAdministrator,
  toggleAdministrator
}: OwnerViewProps) {
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newAdminForm, setNewAdminForm] = useState({ username: '', password: '', spaceId: '', label: '', address: '', logoUrl: '' });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-oxford-blue">
          <Settings className="text-oxford-blue" />
          Collaboration Spaces
        </h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Space name"
            className="flex-1 p-2 border rounded"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              if (newSpaceName.trim()) {
                createCollabSpace(newSpaceName);
                setNewSpaceName('');
              }
            }}
            className="bg-oxford-blue text-white px-4 py-2 rounded hover:bg-oxford-blue/90 flex items-center gap-2"
          >
            <Plus size={20} /> Create Space
          </button>
        </div>
        <div className="space-y-2">
          {collabSpaces.map(space => (
            <div key={space.id} className="flex items-center justify-between p-3 border rounded">
              <span className="font-medium">{space.name}</span>
              <button
                type="button"
                onClick={() => toggleCollabSpace(space.id)}
                className={`px-4 py-1 rounded ${space.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
              >
                {space.active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-oxford-blue">
          <Users className="text-oxford-blue" />
          Administrators
        </h2>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <input
            type="text"
            placeholder="Username"
            className="p-2 border rounded"
            value={newAdminForm.username}
            onChange={(e) => setNewAdminForm({ ...newAdminForm, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            className="p-2 border rounded"
            value={newAdminForm.password}
            onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
          />
          <select
            className="p-2 border rounded"
            value={newAdminForm.spaceId}
            onChange={(e) => setNewAdminForm({ ...newAdminForm, spaceId: e.target.value })}
          >
            <option value="">Select Space</option>
            {collabSpaces.filter(s => s.active).map(space => (
              <option key={space.id} value={space.id}>{space.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Organization Label (optional)"
            className="p-2 border rounded"
            value={newAdminForm.label}
            onChange={(e) => setNewAdminForm({ ...newAdminForm, label: e.target.value })}
          />
          <input
            type="text"
            placeholder="Address (optional)"
            className="p-2 border rounded col-span-2"
            value={newAdminForm.address}
            onChange={(e) => setNewAdminForm({ ...newAdminForm, address: e.target.value })}
          />
          <input
            type="text"
            placeholder="Logo URL (optional)"
            className="p-2 border rounded col-span-2"
            value={newAdminForm.logoUrl}
            onChange={(e) => setNewAdminForm({ ...newAdminForm, logoUrl: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (newAdminForm.username && newAdminForm.password && newAdminForm.spaceId) {
              createAdministrator(newAdminForm.username, newAdminForm.password, newAdminForm.spaceId, newAdminForm.label, newAdminForm.address, newAdminForm.logoUrl);
              setNewAdminForm({ username: '', password: '', spaceId: '', label: '', address: '', logoUrl: '' });
            }
          }}
          className="bg-oxford-blue text-white px-4 py-2 rounded hover:bg-oxford-blue/90 mb-4 flex items-center gap-2"
        >
          <Plus size={20} /> Create Administrator
        </button>
        <div className="space-y-2">
          {administrators.map(admin => (
            <div key={admin.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <span className="font-medium">{admin.username}</span>
                <span className="text-sm text-gray-600 ml-2">
                  ({collabSpaces.find(s => s.id === admin.collabSpaceId)?.name})
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleAdministrator(admin.id)}
                className={`px-4 py-1 rounded ${admin.active ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
              >
                {admin.active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
