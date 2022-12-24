{ pkgs }: {
	deps = [
    pkgs.vim
    pkgs.wabt
    pkgs.emscripten
    pkgs.python38Packages.libxml2.bin
    pkgs.llvmPackages_13.llvm.dev
    pkgs.nodejs-16_x
    pkgs.cmake
    pkgs.nodePackages.typescript-language-server
    pkgs.nodePackages.yarn
    pkgs.replitPackages.jest
	];
}