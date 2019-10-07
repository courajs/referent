{
  network.description = "Connote server";
  network.enableRollback = true;

  server = 
  { config, pkgs, ... }:
  {
    nixpkgs.system = "x86_64-linux";
    imports =
      [ # Include the results of the hardware scan.
        ./vultr-hardware-configuration.nix
        ./run-sync-server.nix
        ./serve-config.nix
      ];

    # Use the GRUB 2 boot loader.
    boot.loader.grub.enable = true;
    boot.loader.grub.version = 2;
    # boot.loader.grub.efiSupport = true;
    # boot.loader.grub.efiInstallAsRemovable = true;
    # boot.loader.efi.efiSysMountPoint = "/boot/efi";
    # Define on which hard drive you want to install Grub.
    boot.loader.grub.device = "/dev/vda"; # or "nodev" for efi only

    # networking.hostName = "nixos"; # Define your hostname.
    # networking.wireless.enable = true;  # Enables wireless support via wpa_supplicant.

    # Configure network proxy if necessary
    # networking.proxy.default = "http://user:password@proxy:port/";
    # networking.proxy.noProxy = "127.0.0.1,localhost,internal.domain";

    # Select internationalisation properties.
    # i18n = {
    #   consoleFont = "Lat2-Terminus16";
    #   consoleKeyMap = "us";
    #   defaultLocale = "en_US.UTF-8";
    # };

    # Set your time zone.
    time.timeZone = "America/New_York";

    # List packages installed in system profile. To search, run:
    # $ nix search wget
    environment.systemPackages = with pkgs; [
      wget vim curl git nodejs-10_x
    ];

    # Some programs need SUID wrappers, can be configured further or are
    # started in user sessions.
    # programs.mtr.enable = true;
    # programs.gnupg.agent = { enable = true; enableSSHSupport = true; };

    # List services that you want to enable:

    # Enable the OpenSSH daemon.
    services.openssh.enable = true;
    # services.openssh.permitRootLogin = "no";

    # Open ports in the firewall.
    networking.firewall.allowedTCPPorts = [ 80 443 ];
    # networking.firewall.allowedUDPPorts = [ ... ];
    # Or disable the firewall altogether.
    # networking.firewall.enable = false;

    users.mutableUsers = false;
    users.users.root.openssh.authorizedKeys.keys = [ "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCnGeYxCWyKsMST5ce4wOsr+tIhjwCBfpzfJmGPHfXoYuXoQ774k7arOosLBh1yYQMj5HhHf3qHSn7lPRvjC8H/MfN9v3zOsXfIv8w3ozXhMuASouh27t120LYVrjr4U/OTpsWOPLdBsDDS6FMQrJCOQFjgAs5YmVuxBTq1g/iyKkeFlunIc8qWPD8JvFnUulrnPCyV9KHjLzkOrjxt2B3PbYbY9BIXdhMo0WN0S5itWo+6pbLtgk86KgpVzCG8Dk8Ua+EYhkDkOw/gqyMe75Z9NPmn9jTeqRHtlV6wKldRomkttsXlFbMLuui8cuOhkqyoFGyZE+gYYTwwHohwMD+v" ];
    # Define a user account. Don't forget to set a password with ‘passwd’.
    # users.users.aaron = {
    #   uid = 1000;
    #   # password = "temprury";
    #   isNormalUser = true;
    #   extraGroups = [ "wheel" ];
    #   openssh.authorizedKeys.keys = [ "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCnGeYxCWyKsMST5ce4wOsr+tIhjwCBfpzfJmGPHfXoYuXoQ774k7arOosLBh1yYQMj5HhHf3qHSn7lPRvjC8H/MfN9v3zOsXfIv8w3ozXhMuASouh27t120LYVrjr4U/OTpsWOPLdBsDDS6FMQrJCOQFjgAs5YmVuxBTq1g/iyKkeFlunIc8qWPD8JvFnUulrnPCyV9KHjLzkOrjxt2B3PbYbY9BIXdhMo0WN0S5itWo+6pbLtgk86KgpVzCG8Dk8Ua+EYhkDkOw/gqyMe75Z9NPmn9jTeqRHtlV6wKldRomkttsXlFbMLuui8cuOhkqyoFGyZE+gYYTwwHohwMD+v" ];
    # };

    # This value determines the NixOS release with which your system is to be
    # compatible, in order to avoid breaking some software such as database
    # servers. You should change this only after NixOS release notes say you
    # should.
    system.stateVersion = "18.09"; # Did you read the comment?

  };
}
