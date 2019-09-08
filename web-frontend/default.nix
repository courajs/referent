with (import <nixpkgs> {});
derivation rec {
  name = "nomicon-frontend";
  system = builtins.currentSystem;

  src = builtins.filterSource
    (path: type:
      let filename = baseNameOf path; in
      !(
        filename == "result"       && type == "symlink"   ||
        filename == "node_modules" && type == "directory" ||
        filename == "dist"         && type == "directory" ||
        filename == "tests"        && type == "directory" ||
        filename == "tmp"          && type == "directory" ||
        filename == ".git"         && type == "directory"
      )
    )
  ./.;

  node_modules = import ../yarn-deps.nix ./package.json ./yarn.lock;
  node = nodejs-12_x;

  PATH = "${coreutils}/bin:${bash}/bin:${node}/bin";
  builder = "${bash}/bin/bash";
  args = [ ./builder.sh ];
}
