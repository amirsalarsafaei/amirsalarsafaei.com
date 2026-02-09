{
  description = "amirsalarsafaei.com - Personal website with Next.js frontend and Rust backend";

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
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      perSystem =
        {
          pkgs,
          system,
          config,
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
            inherit inputs system;
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
