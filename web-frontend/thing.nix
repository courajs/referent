with (import <nixpkgs> {});
derivation {
  name = "thingo";
  system = builtins.currentSystem;
  builder = "${bash}/bin/bash";
  args = 
}
