{config, pkgs, ...}:

let app = import ./web-frontend;
in {
  services.nginx = {
     enable = true;
     recommendedGzipSettings = true;
     recommendedOptimisation = true;
     recommendedProxySettings = true;
     recommendedTlsSettings = true;
     virtualHosts."graph.recurse.com" = {
       # addSSL = true;
       # enableACME = true;
       locations = {
        "/" = {
          root = app;
        };
       };
     };
   };
}
