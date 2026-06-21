import type { SourceDefinition } from '../domain/catalog/types'
import { FITGIRL_SOURCE } from './fitgirl'
import { DODI_SOURCE } from './dodi'
import { STEAMRIP_SOURCE } from './steamrip'
import { ONLINEFIX_SOURCE } from './onlinefix'
import { GOGGAMES_SOURCE } from './goggames'
import { ELAMIGOS_SOURCE } from './elamigos'
import { GLOAD_SOURCE } from './gload'
import { OVAGAMES_SOURCE } from './ovagames'
import { XATAB_SOURCE } from './xatab'
import { REPACK_GAMES_SOURCE } from './repack-games'
import { REPACKLAB_SOURCE } from './repacklab'

export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  FITGIRL_SOURCE,
  DODI_SOURCE,
  STEAMRIP_SOURCE,
  ONLINEFIX_SOURCE,
  GOGGAMES_SOURCE,
  ELAMIGOS_SOURCE,
  GLOAD_SOURCE,
  OVAGAMES_SOURCE,
  XATAB_SOURCE,
  REPACK_GAMES_SOURCE,
  REPACKLAB_SOURCE,
]

export const BUNDLED_SOURCE_DEFINITIONS = SOURCE_DEFINITIONS
