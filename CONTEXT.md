# Plundernome — Domain Glossary

## Core Entities

**Game** — Playable title in catalog or library. ID = hash(sourceId + sourceGameId). Metadata: name, description, size, tags. Has zero or more RepackSources.

**RepackSource** — Downloadable game installer origin (FitGirl, DODI, ElAmigos, etc). Defined by SourceDefinition: baseUrl, scrapeType, selectors, downloadLinkType. Scraped periodically.

**SourceDefinition** — Config for a RepackSource. Mirrors, update interval, scrape selectors, download link patterns.

**Catalog** — All discoverable Games from all RepackSources. Enriched via metadata providers (IGDB, SteamGridDB) for cover art, description, genres, release date, screenshots.

**Library** — User's owned/installed games. Union of catalog-downloaded, manually imported, Steam imported, and ROM scanned games. Each entry has install path, compat profile, playtime, ProtonDB rating.

**Download** — Game being retrieved. Queue with priority + position. State machine: queued → downloading → paused/retrying → completed. Backend: HTTP direct / Transmission torrent / debrid / hoster.

**Pipeline** — Install lifecycle for a download. States: downloading → verifying → extracting → detecting-deps → installing-deps → finding-exe → registering → completed.

**CompatProfile** — Requirements to run a game: native/Wine/Proton. Dependencies (vcredist, directx, dotnet, etc). Environment variables. Launch command.

## Emulators & ROMs

**EmulatorPlatform** — Retro gaming platform (PS1, PS2, PSP, NES, SNES, N64, Dreamcast, Saturn, GameCube, Wii, PS3, WiiU, Switch, Xbox360, GB/GBC/GBA, DS, 3DS, PS Vita, Master System, Genesis, Game Gear, PC Engine, Neo Geo, MAME). Each maps to known emulator binaries and ROM extensions.

**ROM** — Game file for an EmulatorPlatform. Scanned from user ROM folders. Launched via detected emulator. Metadata from IGDB + SteamGridDB.

**BIOS** — Required firmware for some platforms (PS1, PS2, Dreamcast, etc). Verified by CRC32 checksum against known-good values.

## Save & Sync

**CloudSave** — Game save data. Local backup via Ludusavi (community save-location manifest). Sync via WebDAV/Nextcloud or optional relay server.

**Ludusavi** — External tool for game save discovery and backup/restore. Community-maintained manifest of save file locations per game.

**SyncPeer** — Another Plundernome instance on LAN. Discovered via UDP broadcast. Can share library state, wishlist.

## Achievements & Social

**Achievement** — User accomplishment for a Game. Sources: local file scanning (repack unlock detection) + Steam Web API (owned games). Displayed per-game.

**RelayServer** — Optional backend for cloud save sync + friends/social. Lightweight, self-hostable. REST API, SQLite.

## Settings

**Pref** — User preference stored in GSettings. Keys: install path, color scheme, torrent client choice, debrid API keys, theme, speed limits.

## Supported Emulators (full list)

PS1:DuckStation, PS2:PCSX2, PSP:PPSSPP, GameCube/Wii:Dolphin, PS3:RPCS3, WiiU:Cemu, Switch:Ryujinx, Xbox360:Xenia, NES:Mesen2, SNES:bsnes/Snes9x, Genesis:BlastEm, N64:RMG, Dreamcast:Flycast, Saturn:Mednafen, GB/GBC/GBA:mGBA, DS:MelonDS, 3DS:Lime3DS, PS Vita:Vita3K, MasterSystem/GameGear:, PC Engine:Mednafen, NeoGeoPocket:, WonderSwan:Mednafen, MAME:FBNeo
