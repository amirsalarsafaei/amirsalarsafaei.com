{
  pkgs,
  inputs,
  system,
}:

let
  backend = pkgs.callPackage ./backend.nix { };
  frontend = pkgs.callPackage ./frontend.nix { };
in
{
  inherit backend frontend;
  backendImage = pkgs.callPackage ./backend-image.nix { inherit backend; };
  frontendImage = pkgs.callPackage ./frontend-image.nix { inherit frontend; };
  default = backend;
}
