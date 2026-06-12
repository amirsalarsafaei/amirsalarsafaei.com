#!/usr/bin/env bash
# Recompute the fixed-output hashes that Nix cannot derive from the lockfiles
# alone and write them back into the nix package files — without building the
# frontend or the Go binary.
#
#   * yarn offline cache (fetchYarnDeps)  -> nix/packages/frontend.nix
#                                            nix/packages/frontend-build-tree.nix
#   * Go module vendor (buildGoModule)    -> nix/packages/tuissh.nix
#
# The Rust backend uses cargoLock.lockFile (no hash to maintain).
#
# Usage:  just update-nix-hashes      (or)   nix/update-hashes.sh
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

frontend_nix="nix/packages/frontend.nix"
frontend_tree_nix="nix/packages/frontend-build-tree.nix"
tuissh_nix="nix/packages/tuissh.nix"

# Replace `<key> = "sha256-...";` in $1 with the value $3 for key $2.
write_hash() {
  local file="$1" key="$2" value="$3"
  sed -i -E "s|(${key} = \")sha256-[A-Za-z0-9+/=]+(\";)|\1${value}\2|" "$file"
}

###############################################################################
# 1) yarn offline cache — fully offline of any nix build, via prefetch-yarn-deps
###############################################################################
echo "==> Prefetching yarn offline cache from frontend/yarn.lock ..."
raw_yarn_hash="$(nix run nixpkgs#prefetch-yarn-deps -- frontend/yarn.lock 2>/dev/null | tail -n1)"
if [[ "$raw_yarn_hash" == sha256-* ]]; then
  yarn_hash="$raw_yarn_hash"
else
  # Older prefetch-yarn-deps prints a base32/base16 digest; convert to SRI.
  yarn_hash="$(nix hash convert --hash-algo sha256 --to sri "$raw_yarn_hash")"
fi
echo "    yarnOfflineCache hash = $yarn_hash"
# Both files pin the same cache (same yarn.lock).
write_hash "$frontend_nix" "hash" "$yarn_hash"
write_hash "$frontend_tree_nix" "hash" "$yarn_hash"

###############################################################################
# 2) Go module vendor — realize only the goModules FOD (fetch, no compile).
#    Force a mismatch with a zero hash so Nix reports the real one, then write.
###############################################################################
echo "==> Computing tuissh Go vendorHash (fetches modules, does not compile) ..."
zero_hash="sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
orig_vendor_hash="$(sed -nE 's|.*vendorHash = "(sha256-[A-Za-z0-9+/=]+)";.*|\1|p' "$tuissh_nix")"

write_hash "$tuissh_nix" "vendorHash" "$zero_hash"
got_vendor_hash="$(
  nix build --no-link '.#tuissh.goModules' 2>&1 |
    grep -oE 'got:[[:space:]]+sha256-[A-Za-z0-9+/=]+' |
    awk '{print $NF}' | tail -n1 || true
)"
if [[ -z "$got_vendor_hash" ]]; then
  # No mismatch reported => the zero hash somehow matched (impossible) or the
  # build path changed. Restore the original and bail loudly.
  write_hash "$tuissh_nix" "vendorHash" "$orig_vendor_hash"
  echo "ERROR: could not determine Go vendorHash from 'nix build .#tuissh.goModules'." >&2
  exit 1
fi
write_hash "$tuissh_nix" "vendorHash" "$got_vendor_hash"
echo "    vendorHash = $got_vendor_hash"

echo
echo "Done. Updated:"
echo "  $frontend_nix"
echo "  $frontend_tree_nix"
echo "  $tuissh_nix"
git --no-pager diff -- "$frontend_nix" "$frontend_tree_nix" "$tuissh_nix" || true
