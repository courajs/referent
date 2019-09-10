{config, pkgs, ...}:
let app = import ./server;
in {
  # systemd.services.referent-sync-server = {
  #   description = "Data sync server for Referent";
  #   wantedBy = [ "multi-user.target" ];
  #   after = [ "network.target" ];
  #   serviceConfig = {
  #     ExecStart = "PORT=3030 ${pkgs.nodejs-10_x}/bin/node ${app}/server.js /var/referent/sqlite.db";
  #   };
  # };
}
