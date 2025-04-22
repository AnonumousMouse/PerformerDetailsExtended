import DetailGroup from "@components/DetailGroup";
import ItemAverageRating from "@components/ItemAverageRating";
import ItemAppearsMostWith from "@components/ItemAppearsMostWith";
import ItemOCount from "@components/ItemOCount";
import ItemScenesOrganized from "@components/ItemScenesOrganized";
import ItemScenesTimespan from "@components/ItemScenesTimespan";
import ItemTopStudio from "@components/ItemTopStudio";
import ItemTopTags from "@components/ItemTopTags";
import ItemTotalContent from "@components/ItemTotalContent";
import ItemTotalPlayDuration from "@components/ItemTotalPlayDuration";
import { default as cx } from "classnames";
import "./styles.scss";
import { DEFAULT_PLUGIN_CONFIG as DEF_PLUGIN_CONF } from "./common/constants";

const { PluginApi } = window;
const { GQL, React } = PluginApi;
const { LoadingIndicator } = PluginApi.components;

/* -------------------------------------------------------------------------- */
/*                               PluginApi patch                              */
/* -------------------------------------------------------------------------- */

PluginApi.patch.instead(
  "PerformerDetailsPanel.DetailGroup",
  function (props, _, Original) {
    const { collapsed, performer } = props;
    const performerID = performer.id;

    /* ------------------------------ Configuration ----------------------------- */

    // Get config data before doing anything else
    const qConfig = GQL.useConfigurationQuery();
    if (qConfig.loading) return [];

    const configurationQueryResult = qConfig.data
      .configuration as PDEConfigResult;
    const { compactExpandedDetails, showAllDetails } =
      configurationQueryResult.ui;
    const userConfig =
      configurationQueryResult.plugins.PerformerDetailsExtended;

    // Compile the user's config with config defaults
    const pluginConfig: PDEFinalConfigMap = {
      additionalStyling: userConfig?.additionalStyling ?? DEF_PLUGIN_CONF.additionalStyling,
      appearsMostWithTagsBlacklist:
        userConfig?.appearsMostWithTagsBlacklist ?? DEF_PLUGIN_CONF.appearsMostWithTagsBlacklist,
      appearsMostWithTagsBlacklistChildren:
        userConfig?.appearsMostWithTagsBlacklistChildren ?? DEF_PLUGIN_CONF.appearsMostWithTagsBlacklistChildren,
      appearsMostWithGendered:
        userConfig?.appearsMostWithGendered ?? DEF_PLUGIN_CONF.appearsMostWithGendered,
      maximumTops: userConfig?.maximumTops ?? DEF_PLUGIN_CONF.maximumTops,
      minimumAppearances:
        userConfig?.minimumAppearances ?? DEF_PLUGIN_CONF.minimumAppearances,
      scenesTimespanReverse:
        userConfig?.scenesTimespanReverse ?? DEF_PLUGIN_CONF.scenesTimespanReverse,
      showWhenCollapsed:
        userConfig?.showWhenCollapsed ?? DEF_PLUGIN_CONF.showWhenCollapsed,
      topNetworkOn: userConfig?.topNetworkOn ?? DEF_PLUGIN_CONF.topNetworkOn,
      topTagsBlacklist: userConfig?.topTagsBlacklist ?? "",
      topTagsBlacklistChildren: userConfig?.topTagsBlacklistChildren ?? false,
      topTagsCount: userConfig?.topTagsCount ?? DEF_PLUGIN_CONF.topTagsCount,
      topTagsOn: userConfig?.topTagsOn ?? DEF_PLUGIN_CONF.topTagsOn,
      totalPlayCountOn:
        userConfig?.totalPlayCountOn ?? DEF_PLUGIN_CONF.totalPlayCountOn,
      minimumScenesForDetails:
        userConfig?.minimumScenesForDetails ?? DEF_PLUGIN_CONF.minimumScenesForDetails,
    };

    const originalComponent = (
      <DetailGroup
        {...props}
        className={cx({
          "detail-group-pde-themed": pluginConfig.additionalStyling,
        })}
      />
    );

    /* --------------------------- Fetch required data -------------------------- */

    const qScenes = GQL.useFindScenesQuery({
      variables: {
        filter: { per_page: -1, sort: "date" },
        scene_filter: {
          performers: {
            modifier: CriterionModifier.Includes,
            value: [performerID],
          },
        },
      },
    });

    // State to track whether the minimumScenesForDetails condition is met
    const [meetsMinimumScenes, setMeetsMinimumScenes] = React.useState(false);

    // Compute showDetails before useEffect
    const showDetails = !collapsed || pluginConfig.showWhenCollapsed;

    // Skip checking scene count if showDetails is false
    React.useEffect(() => {
      if (!qScenes.loading && showDetails) {
        const scenesQueryResult = qScenes.data.findScenes;
        const totalScenes = scenesQueryResult.scenes.length;
        setMeetsMinimumScenes(totalScenes >= pluginConfig.minimumScenesForDetails);
      }
    }, [qScenes.loading, showDetails]);

    // Conditionally call the queries based on the meetsMinimumScenes state
    const qAllTags = meetsMinimumScenes
      ? GQL.useFindTagsQuery({
          variables: {
            filter: { per_page: -1, sort: "id" },
          },
        })
      : { loading: false, data: { findTags: [] } };

    const qStudios = meetsMinimumScenes
      ? GQL.useFindStudiosQuery({
          variables: {
            filter: { per_page: -1, sort: "id" },
            studio_filter: {
              scenes_filter: {
                performers: {
                  modifier: CriterionModifier.Includes,
                  value: [performerID],
                },
              },
            },
          },
        })
      : { loading: false, data: { findStudios: [] } };

    const qStats = meetsMinimumScenes
      ? GQL.useStatsQuery()
      : { loading: false, data: { stats: {} } };

    /**
     * Only display the plugin data if:
     * * The required data has been loaded.
     * * AND The performer details section is NOT collapsed
     * * UNLESS the user has set to override this behaviour.
     */
    const dataLoading =
      qScenes.loading || qAllTags.loading || qStats.loading || qStudios.loading;

    /** Display as collapsed if currently collapsed, or compact details is
     * `true` in the native config. */
    const isCollapsed = collapsed || !!compactExpandedDetails;

    // Render the original component and a loading indicator until the required
    // data is available, but only after qScenes has finished loading
    if (dataLoading && showDetails) {
      return [
        <>
          {originalComponent}
          if (!qScenes.loading) {
            // Show a loading indicator if the qScenes query is not loading but everything else is:
            <LoadingIndicator card message="Loading extended details..." />
          } else {
            // Show nothing if the qScenes query is still loading:
            <div style={{ display: 'none' }}></div>
          }
        </>,
      ];
    }

    if (dataLoading || !showDetails) return [originalComponent];

    const scenesQueryResult = qScenes.data.findScenes;
    const allTagsQueryResult = qAllTags.data.findTags;
    const statsQueryResult = qStats.data.stats;
    const studiosQueryResult = qStudios.data.findStudios;

    // Fetch the minimumScenesForDetails value from the plugin configuration
    const minimumScenesForDetails = userConfig?.minimumScenesForDetails ?? 3;

    // Query scenes data to get the total number of scenes
    const { scenes } = scenesQueryResult;
    const totalScenes = scenes.length;

    // Check if the performer's scene count meets the minimum requirement
    if (totalScenes < minimumScenesForDetails) {
      return [originalComponent];
    }

    /* -------------------------------- Component ------------------------------- */

    return [
      <>
        {originalComponent}
        <DetailGroup
          id="performerDetailsExtended"
          className={cx("performer-details-extended", {
            "detail-group-pde-themed": pluginConfig.additionalStyling,
          })}
        >
          <ItemAverageRating
            collapsed={isCollapsed}
            configurationQueryResult={configurationQueryResult}
            performer={performer}
            scenesQueryResult={scenesQueryResult}
          />
          <ItemAppearsMostWith
            allTagsQueryResult={allTagsQueryResult}
            collapsed={isCollapsed}
            performer={performer}
            pluginConfig={pluginConfig}
            scenesQueryResult={scenesQueryResult}
          />
          <ItemTopStudio
            collapsed={isCollapsed}
            performer={performer}
            pluginConfig={pluginConfig}
            scenesQueryResult={scenesQueryResult}
            studiosQueryResult={studiosQueryResult}
          />
          <ItemTotalContent
            collapsed={isCollapsed}
            scenesQueryResult={scenesQueryResult}
          />
          <ItemTotalPlayDuration
            collapsed={isCollapsed}
            pluginConfig={pluginConfig}
            scenesQueryResult={scenesQueryResult}
            statsQueryResult={statsQueryResult}
          />
          <ItemScenesTimespan
            collapsed={isCollapsed}
            pluginConfig={pluginConfig}
            scenesQueryResult={scenesQueryResult}
          />
          <ItemScenesOrganized
            collapsed={isCollapsed}
            scenesQueryResult={scenesQueryResult}
          />
          <ItemOCount
            collapsed={isCollapsed}
            scenesQueryResult={scenesQueryResult}
            statsQueryResult={statsQueryResult}
          />
          <ItemTopTags
            allTagsQueryResult={allTagsQueryResult}
            collapsed={collapsed}
            performer={performer}
            pluginConfig={pluginConfig}
            scenesQueryResult={scenesQueryResult}
          />
        </DetailGroup>
      </>,
    ];
  }
);
