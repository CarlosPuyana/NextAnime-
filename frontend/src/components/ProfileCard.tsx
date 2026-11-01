import type { CSSProperties } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import type { ProfileIdentity } from "../config/profiles";
import { ProfileAvatar } from "./ProfileAvatar";

export function ProfileCard({
  identity,
  selected,
  last,
  disabled,
  onSelect,
}: {
  identity: ProfileIdentity;
  selected: boolean;
  last: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const style = {
    "--card-accent": identity.accentColor,
    "--card-secondary": identity.palette.secondary,
    "--card-surface": identity.palette.surface,
  } as CSSProperties;
  return (
    <button
      className={`profile-card identity-card ${selected ? "chosen" : ""}`}
      style={style}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      data-profile-id={identity.id}
      aria-label={`${identity.displayName} @${identity.malUsername}. ${identity.subtitle}. ${last ? "Último perfil utilizado" : identity.microcopy.enter}`}
    >
      <span className="avatar-frame">
        <ProfileAvatar identity={identity} />
        <span className="profile-motif" aria-hidden="true">
          {identity.decorativeTokens.symbol}
        </span>
        <span className="profile-arrow" aria-hidden="true">
          {selected ? <Check size={17} /> : <ArrowUpRight size={17} />}
        </span>
        <span className="portrait-caption">{identity.subtitle}</span>
      </span>
      <span className="profile-name">{identity.displayName}</span>
      <span className="profile-username">@{identity.malUsername}</span>
      <span className="profile-tagline">{identity.tagline}</span>
      <span className="profile-hint">
        {last ? "Último perfil utilizado" : identity.microcopy.enter}
      </span>
    </button>
  );
}
