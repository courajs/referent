with (import <nixpkgs> {});
derivation rec {
  name = "referent-sync-server";
  system = "x86_64-linux";

  src = builtins.filterSource
    (path: type:
      let filename = baseNameOf path; in
      !(
        filename == "result"       && type == "symlink"   ||
        filename == "node_modules" && type == "directory" ||
        filename == "data"         && type == "directory" ||
        filename == "tmp"          && type == "directory" ||
        filename == ".git"         && type == "directory"
      )
    )
  ./.;

  node_modules = derivation rec {
    name = "sync-server-build-deps";
    system = "x86_64-linux";

    packageJSON = ./package.json;
    yarnLock = ./yarn.lock;

    PATH = "${coreutils}/bin:${yarn}/bin";
    builder = "${bash}/bin/bash";
    args = [ ../yarn-deps-builder.sh ];
  };

  PATH = "${coreutils}/bin:${bash}/bin";
  builder = "${bash}/bin/bash";
  args = [ ./builder.sh ];
}
