{
  pkgs,
}:

let
  backend = pkgs.callPackage ./backend.nix { };
  frontend = pkgs.callPackage ./frontend.nix { };
  ssh = pkgs.callPackage ./ssh.nix { };
in
{
  inherit backend frontend ssh;
  frontendLocal = frontend.override { frontendEnv = "local"; };
  backendImage = pkgs.callPackage ./backend-image.nix { inherit backend; };
  frontendImage = pkgs.callPackage ./frontend-image.nix { inherit frontend; };
  default = backend;
}
