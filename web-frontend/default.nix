with (import <nixpkgs> {});
derivation rec {
  name = "nomicon-frontend";
  system = builtins.currentSystem;

  src = builtins.filterSource
    (path: type:
      (!(
        path == builtins.toString ./result ||
        path == builtins.toString ./node_modules ||
        path == builtins.toString ./dist ||
        path == builtins.toString ./tests ||
        path == builtins.toString ./tmp ||
        path == builtins.toString ./.git
      ))
    )
  ./.;

  node_modules = import ../yarn-deps.nix ./package.json ./yarn.lock;
  node = nodejs-10_x;
  npm = "${node}/bin/npm";

  PATH = "${coreutils}/bin:${bash}/bin:${node}/bin";
  builder = "${bash}/bin/bash";
  args = [ ./builder.sh ];
}
