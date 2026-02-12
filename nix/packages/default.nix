{
  pkgs,
  inputs,
  system,
}:

let
  backend = pkgs.callPackage ./backend.nix { };
  # buildEnv must be explicitly passed to avoid collision with pkgs.buildEnv
  frontend = pkgs.callPackage ./frontend.nix { buildEnv = "production"; };
in
{
  inherit backend frontend;
  # Allow overriding build environment: nix build .#frontend.override { buildEnv = "local"; }
  frontendLocal = frontend.override { buildEnv = "local"; };
  backendImage = pkgs.callPackage ./backend-image.nix { inherit backend; };
  frontendImage = pkgs.callPackage ./frontend-image.nix { inherit frontend; };
  default = backend;
}
