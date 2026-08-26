#ifndef AppVersion
  #define AppVersion "0.0.0-dev"
#endif
#ifndef SourceDir
  #define SourceDir "..\\dist\\windows\\webview-publish"
#endif
#ifndef OutputDir
  #define OutputDir "..\\dist\\windows"
#endif

[Setup]
AppId={{B7C3F4F1-9C48-4D4D-9F83-3F7A3F0F4F2B}
AppName=Vyline Desktop
AppVersion={#AppVersion}
AppPublisher=nezumi0627
AppPublisherURL=https://github.com/nezumi0627/Vyline-Desktop
DefaultDirName={localappdata}\Programs\VylineDesktop
DefaultGroupName=Vyline Desktop
OutputDir={#OutputDir}
OutputBaseFilename=Vyline-Desktop-Setup-{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no
Uninstallable=yes

[Languages]
Name: "japanese"; MessagesFile: "compiler:Languages\Japanese.isl"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Vyline Desktop"; Filename: "{app}\VylineDesktop.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\Vyline Desktop"; Filename: "{app}\VylineDesktop.exe"; WorkingDir: "{app}"

[Run]
Filename: "{app}\VylineDesktop.exe"; Description: "Vyline Desktopを起動する"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM VylineDesktop.exe"; Flags: runhidden
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM vyline-backend.exe"; Flags: runhidden
