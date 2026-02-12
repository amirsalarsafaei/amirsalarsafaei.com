{
  pkgs,
  inputs,
  system,
}:

let
  backend = pkgs.callPackage ./backend.nix { };
  # callPackage automatically handles buildEnv parameter with "production" as default
  frontend = pkgs.callPackage ./frontend.nix { };
in
{
  inherit backend frontend;
  # Allow overriding build environment: nix build .#frontend.override { buildEnv = "local"; }
  frontendLocal = frontend.override { buildEnv = "local"; };
  backendImage = pkgs.callPackage ./backend-image.nix { inherit backend; };
  frontendImage = pkgs.callPackage ./frontend-image.nix { inherit frontend; };
  default = backend;
}
