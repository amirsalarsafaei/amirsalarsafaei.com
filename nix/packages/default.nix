{
  pkgs,
}:

let
  backend = pkgs.callPackage ./backend.nix { };
  frontend = pkgs.callPackage ./frontend.nix { inherit backend; };
  # Source tree with pure node_modules but no `next build`; the build runs
  # on-server against the live backend (see the NixOS *-frontend-build unit).
  frontendBuildTree = pkgs.callPackage ./frontend-build-tree.nix { };
  ssh = pkgs.callPackage ./ssh.nix { };
in
{
  inherit
    backend
    frontend
    frontendBuildTree
    ssh
    ;
  frontendLocal = frontend.override { frontendEnv = "local"; };
  backendImage = pkgs.callPackage ./backend-image.nix { inherit backend; };
  frontendImage = pkgs.callPackage ./frontend-image.nix { inherit frontend; };
  default = backend;
}
