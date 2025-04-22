/** `enum GenderEnum` as an array. */
export const GENDERS = [
  "MALE",
  "FEMALE",
  "TRANSGENDER_MALE",
  "TRANSGENDER_FEMALE",
  "INTERSEX",
  "NON_BINARY",
] as GenderEnum[];

/** Default values for plugin configuration options, including booleans. */
export const DEFAULT_PLUGIN_CONFIG = {
  minimumScenesForDetails: 3,
  maximumTops: 3,
  minimumAppearances: 2,
  topTagsCount: 3,
  additionalStyling: false,
  appearsMostWithTagsBlacklist: "",
  appearsMostWithTagsBlacklistChildren: false,
  appearsMostWithGendered: true,
  scenesTimespanReverse: false,
  showWhenCollapsed: false,
  topNetworkOn: true,
  topTagsOn: true,
  totalPlayCountOn: false,
};
