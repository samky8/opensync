'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ChevronsUpDown, Crown, Plus } from 'lucide-react';

export function ProfileMenu({
  name,
  logo,
  locations,
  selected,
  paid,
  disabled,
  canCreate,
  demo,
  onSelect,
  onCreate,
}: {
  name: string;
  logo?: string;
  locations: { id: string; draft: { name: string } }[];
  selected: string;
  paid: boolean;
  disabled: boolean;
  canCreate: boolean;
  demo: boolean;
  onSelect: (id: string) => void;
  onCreate: () => boolean;
}) {
  const id = useId();
  const popup = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  return (
    <>
      <button
        className="workspace-selector"
        aria-label="Switch business location"
        title={name}
        popoverTarget={id}
        disabled={disabled}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 270) });
        }}
      >
        <div className="business-avatar">
          {logo ? (
            <Image src={logo} alt={`${name} logo`} width={32} height={32} unoptimized />
          ) : (
            name.charAt(0)
          )}
        </div>
        <div>
          <strong>{name}</strong>
          <span>{demo ? 'Example business' : 'Your workspace'}</span>
        </div>
        <ChevronsUpDown size={14} />
      </button>
      <div
        id={id}
        ref={popup}
        popover="auto"
        className="profile-dropdown"
        style={position}
        aria-label="Profiles"
      >
        <div className="profile-list">
          {(demo ? [{ id: selected, draft: { name } }] : locations).map((location) => (
            <button
              key={location.id}
              data-profile-id={location.id}
              aria-current={location.id === selected ? 'true' : undefined}
              onClick={() => {
                onSelect(location.id);
                popup.current?.hidePopover();
              }}
            >
              <span>{location.draft.name}</span>
              {location.id === selected && <Check size={16} />}
            </button>
          ))}
        </div>
        <div className="profile-dropdown-footer">
          {paid && canCreate && !disabled ? (
            <Link
              href={demo ? '/signup' : `/onboarding?source=${encodeURIComponent(selected)}`}
              onClick={(event) => {
                if (!onCreate()) event.preventDefault();
                else popup.current?.hidePopover();
              }}
            >
              <Plus size={16} />
              Create new profile
            </Link>
          ) : (
            <button
              disabled
              title={paid ? 'Only an owner or admin can create profiles' : 'Requires Pro'}
            >
              <Crown size={16} aria-hidden="true" />
              Create new profile
            </button>
          )}
        </div>
      </div>
    </>
  );
}
