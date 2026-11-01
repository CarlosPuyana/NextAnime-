import type { CSSProperties } from "react";
import { UserRound } from "lucide-react";
import type { ProfileIdentity } from "../config/profiles";

export const profileAssetUrl = (asset: string) =>
  `${import.meta.env.BASE_URL}${asset}`;
export function ProfileAvatar({
  identity,
  small = false,
}: {
  identity: ProfileIdentity;
  small?: boolean;
}) {
  const style: CSSProperties = identity.avatarAsset
    ? {
        backgroundImage: `url("${profileAssetUrl(identity.avatarAsset)}")`,
        backgroundPosition: identity.decorativeTokens.portraitPosition,
      }
    : {};
  return (
    <span
      className={`avatar identity-avatar ${small ? "small" : ""} ${identity.avatarAsset ? "" : "guest-avatar"}`}
      style={style}
      aria-hidden="true"
    >
      {!identity.avatarAsset && (
        <UserRound size={small ? 17 : 38} strokeWidth={1.5} />
      )}
    </span>
  );
}
