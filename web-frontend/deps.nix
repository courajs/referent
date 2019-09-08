with (import <nixpkgs> {});
derivation rec {
  name = "nomicon-build-deps";
  system = builtins.currentSystem;

  packageJSON = ./package.json;
  yarnLock = ./yarn.lock;

  PATH = "${coreutils}/bin:${yarn}/bin";
  builder = "${bash}/bin/bash";
  args = [ ./deps_builder.sh ];
}
