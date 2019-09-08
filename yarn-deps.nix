with (import <nixpkgs> {});
packageJSON: yarnLock:
derivation rec {
  name = "nomicon-build-deps";
  system = builtins.currentSystem;

  inherit packageJSON yarnLock;

  PATH = "${coreutils}/bin:${yarn}/bin";
  builder = "${bash}/bin/bash";
  args = [ ./yarn-deps-builder.sh ];
}
