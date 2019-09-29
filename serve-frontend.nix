{config, pkgs, ...}:

let app = import ./web-frontend;
in {
  services.nginx.virtualHosts."graph.recurse.com".locations = {
    "/" = {
      root = app;
      extraConfig = "error_page 404 /index.html;";
    };
  };
}
