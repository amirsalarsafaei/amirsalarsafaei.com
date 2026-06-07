{
  description = "amirsalarsafaei.com - Personal website with Next.js frontend and Rust backend";

  nixConfig = {
    extra-substituters = "https://cache.nixos.org";
    extra-trusted-public-keys = "cache.nixos.org-1:6NCHdD59X432qBYE9Tm+gkAc4w8q0xEVwK0w3pslAAw=";
  };

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    flake-parts.url = "github:hercules-ci/flake-parts";

    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{
      self,
      nixpkgs,
      flake-parts,
      rust-overlay,
      treefmt-nix,
    }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      flake = {
        nixosModule = inputs.self.nixosModules.default;
        nixosModules = {
          amirsalarsafaei-com = import ./nix/modules/amirsalarsafaei-com.nix { inherit inputs; };
          ssh-service = import ./nix/modules/ssh-service.nix { inherit inputs; };
          default = inputs.self.nixosModules.amirsalarsafaei-com;
        };
      };

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      perSystem =
        {
          system,
          ...
        }:
        let
          pkgsWithOverlays = import nixpkgs {
            inherit system;
            overlays = [ (import rust-overlay) ];
          };

          rustToolchain = pkgsWithOverlays.rust-bin.stable.latest.default.override {
            extensions = [
              "rust-src"
              "rust-analyzer"
            ];
          };

          packages' = import ./nix/packages {
            pkgs = pkgsWithOverlays;
          };

          treefmtEval = treefmt-nix.lib.evalModule pkgsWithOverlays ./nix/treefmt.nix;
        in
        {
          _module.args.pkgs = pkgsWithOverlays;

          packages = packages';

          devShells.default = import ./nix/devshell.nix {
            pkgs = pkgsWithOverlays;
            inherit rustToolchain;
          };

          formatter = treefmtEval.config.build.wrapper;

          checks = {
            formatting = treefmtEval.config.build.check self;
          };
        };
    };
}
