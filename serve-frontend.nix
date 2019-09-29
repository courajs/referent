{config, pkgs, ...}:

let app = import ./web-frontend;
in {
  services.nginx.virtualHosts."graph.recurse.com".locations = {
     "/" = {
       root = app;
     };
  };
}
