import 'plugins/investigate_core/saved_objects/dashboard_groups/saved_dashboard_groups';
import { CacheProvider } from 'ui/kibi/helpers/cache_helper';
import $ from 'jquery';
import _ from 'lodash';
import dashboardNavEditLinkTemplate from './dashboard_nav_edit_link.html';
import './dashboard_nav_edit_link.less';
import 'ui/kibi/directives/kibi_context_menu';
import { DashboardViewMode } from 'src/core_plugins/kibana/public/dashboard/dashboard_view_mode';
import { DashboardConstants } from 'src/core_plugins/kibana/public/dashboard/dashboard_constants';
import { HashedItemStoreSingleton } from 'ui/state_management/state_storage';
import { uiModules } from 'ui/modules';
import 'ui/kibi/directives/kibi_human_readable_number';
import { KibiHumanReadableHelperProvider } from 'ui/kibi/directives/kibi_human_readable_helper';
import { QuickDashboardProvider } from 'ui/kibi/quick_dashboard/quick_dashboard';

uiModules
.get('kibana')
.directive('dashboardNavEditLink', ($rootScope, $route, dashboardGroups, createNotifier,
  dashboardsNavState, savedDashboardGroups, Private, globalNavState, kibiState, AppState,
  savedDashboards, kbnUrl, confirmModalPromise, $timeout) => {

  const kibiHumanReadableHelper = Private(KibiHumanReadableHelperProvider);
  const quickDashboard = Private(QuickDashboardProvider);

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      filter: '=',
      group: '=',
      isFirst: '=',
      updateSavingState: '&'
    },
    template: dashboardNavEditLinkTemplate,
    link: function ($scope, $element) {
      const cache = Private(CacheProvider);
      const notify = createNotifier({
        location: 'Dashboard Navigator'
      });

      const contextMenu = [{
        id: 'edit',
        name: 'Edit',
        topNavKey: null
      }, {
        id: 'rename',
        name: 'Rename',
        topNavKey: 'save'
      }, {
        id: 'clone',
        name: 'Clone'
      }, {
        id: 'options',
        name: 'Options',
        topNavKey: 'options'
      }, {
        type: 'hr'
      }, {
        id: 'delete',
        name: 'Delete'
      }];

      $scope.state = {};

      // PLEASE READ: The declarated value of this constants CAN NOT be changed.
      $scope.DUMMY_PLACEHOLDER_BETWEEN_DASHBOARDS = -1;
      $scope.DUMMY_PLACEHOLDER_BETWEEN_GROUPS = -2;
      $scope.DUMMY_PLACEHOLDER_FIRST_GROUP = -3;

      $scope.menuActionTriggered = false;

      if (!$scope.group.virtual) {
        $scope.contextMenuGroup = contextMenu.filter(menu => {
          return _.indexOf(['rename', 'clone', 'options'], menu.id) < 0;
        });
      } else {
        $scope.contextMenuVirtualGroup = contextMenu;
      }
      $scope.contextMenuDashboard = contextMenu;

      $scope.clickMenuGroup = function (item) {
        $scope.menuActionTriggered = item;
        if (item.id === 'edit') {
          dashboardGroups.setGroupSelection($scope.group);
          dashboardsNavState.setGroupEditorOpen(true);
        } else if (item.id === 'delete') {
          $scope.deleteGroup();
        }
      };

      $scope.clickMenuVirtualGroup = function (item) {
        $scope.menuActionTriggered = item;
        if (item.id === 'delete') {
          $scope.deleteDashboard($scope.group.id, $scope.group.title);
        } else if (item.id === 'clone') {
          $scope.cloneDashboard($scope.group.id);
        } else {
          $scope.editDashboard($scope.group.id, item);
        }
      };

      $scope.clickMenuDashboard = function (item, dashboard) {
        $scope.menuActionTriggered = item;
        if (item.id === 'delete') {
          $scope.deleteDashboard(dashboard.id, dashboard.title);
        } else if (item.id === 'clone') {
          $scope.cloneDashboard(dashboard.id);
        } else {
          $scope.editDashboard(dashboard.id, item);
        }
      };

      $scope.selectDashboard = dashboard => {
        const dashboardId = dashboard ? dashboard.id : null;
        if ($scope.menuActionTriggered) {
          $scope.menuActionTriggered = false;
          return;
        }
        if (dashboardId || $scope.group.virtual) {
          let id;
          if (dashboardId) {
            id = dashboardId;
          } else {
            id = $scope.group.id;
          }
          $scope.updateSavingState({ value: true });
          globalNavState.setOpen(false);
          dashboardGroups.selectDashboard(id);
          return;
        }
        $scope.group.collapsed = !$scope.group.collapsed;
        if (!$scope.group.collapsed) {
          $scope.$emit('kibi:dashboardGroup:expand');
          const dashboardIds = _($scope.group.dashboards).map('id').value();
          if (dashboardIds.length > 0) {
            $scope.group.dashboards.forEach(dashboard => delete dashboard.count);
            dashboardGroups.updateMetadataOfDashboardIds(dashboardIds);
          }
        }
      };

      const dash = kibiState.getDashboardOnView();
      if (dash) {
        $scope.dashboardLoaded = dash.id;
      }

      $rootScope.$on('$routeChangeSuccess', () => {
        const dash = kibiState.getDashboardOnView();
        if (dash) {
          $scope.dashboardLoaded = dash.id;
        }
        $scope.updateSavingState({ value: false });
      });

      $scope.getLastClonedDashboardName = (title) => {
        const regEx = /.*\scopy\s#([0-9]*)$/;
        let last = 0;
        dashboardGroups.getGroups().forEach(group => {
          if (!group.virtual && group.dashboards) {
            group.dashboards.forEach(dash => {
              if (dash.title.indexOf(title + ' copy #') === 0) {
                const match = dash.title.match(regEx);
                const matchNumber = match && match.length > 1 ? +match[1] : 0;
                last = last < matchNumber ? matchNumber : last;
              }
            });
          } else if (group.virtual) {
            if (group.title.indexOf(title + ' copy #') === 0) {
              const match = group.title.match(regEx);
              const matchNumber = match && match.length > 1 ? +match[1] : 0;
              last = last < matchNumber ? matchNumber : last;
            }
          }
        });
        return last;
      };

      $scope.cloneDashboard = (id) => {
        let title;
        $scope.updateSavingState({ value: true });
        savedDashboards.get(id)
        .then(savedDash => {
          savedDash.copyOnSave = true;
          title = savedDash.title;
          const baseTitle = savedDash.title.replace(/\scopy\s#[0-9]*$/, '');
          const lastCopy = $scope.getLastClonedDashboardName(baseTitle);
          savedDash.title = baseTitle + ' copy #' + (lastCopy + 1);
          return savedDash.save();
        })
        .then(cache.invalidate)
        .then(() => {
          $scope.updateSavingState({ value: false });
          notify.info('Dashboard ' + title + ' was successfuly cloned');
          $scope.$emit('kibi:dashboardgroup:changed', id);
        })
        .catch (reason => {
          $scope.updateSavingState({ value: false });
          notify.error(reason);
        });
      };

      $scope.editDashboard = (id, item) => {
        const dash = $route.current.locals.dash;
        if (id === dash.id) {
          $rootScope.$broadcast('kibi:dashboardviewmode:change', DashboardViewMode.EDIT, item.topNavKey);
        } else {
          $scope.updateSavingState({ value: true });
          const state = {
            appState: {
              viewMode: DashboardViewMode.EDIT
            },
            topNav: {
              currentKey: item.topNavKey
            }
          };
          HashedItemStoreSingleton.setItem('kibi_appstate_param', JSON.stringify(state));
          globalNavState.setOpen(false);
          dashboardGroups.selectDashboard(id);
        }
      };

      $scope.removeDashboardFromGroup = (id) => {
        return new Promise((resolve, reject) => {
          const groups = dashboardGroups.getGroups().filter(group => {
            if (group.virtual) {
              return resolve();
            }
            const idx = _.findIndex(group.dashboards, dashboard => {
              return dashboard.id === id;
            });
            return idx >= 0;
          });
          if (groups.length === 0) {
            return resolve();
          }
          const groupId = groups[0].id;
          return resolve(savedDashboardGroups.get(groupId).then(group => {
            const idx = _.findIndex(group.dashboards, dashboard => {
              return dashboard.id === id;
            });
            group.dashboards.splice(idx, 1);
            return group.save();
          }));
        });
      };

      $scope.deleteDashboard = (id, title) => {
        const confirmMessage = `Are you sure you want to delete '${title}'?`;
        confirmModalPromise(confirmMessage, { confirmButtonText: `Delete dashboard` })
        .then(() => {
          $scope.updateSavingState({ value: true });
          Promise.resolve()
          .then(() => quickDashboard.releaseQuickComponents(id))
          .then(() => savedDashboards.delete(id))
          .then(() => $scope.removeDashboardFromGroup(id))
          .then(cache.invalidate)
          .then(() => {
            if ($scope.dashboardLoaded === id) {
              dashboardsNavState.setScrollbarPos(0);
              $scope.$emit('kibi:dashboardgroup:deletedashboard');
            } else {
              $scope.$emit('kibi:dashboardgroup:changed');
            }
            $scope.updateSavingState({ value: false });
            notify.info('Dashboard ' + title + ' was successfuly deleted');
          })
          .catch(reason => {
            $scope.updateSavingState({ value: false });
            notify.error(reason);
          });
        });
      };

      $scope.deleteGroup = () => {
        const confirmMessage = `Are you sure you want to delete '${$scope.group.title}'?`;
        confirmModalPromise(confirmMessage, { confirmButtonText: `Delete dashboard group` })
        .then(() => {
          $scope.updateSavingState({ value: true });
          const group = $scope.group;
          savedDashboardGroups.delete(group.id)
          .then(cache.invalidate)
          .then(() => {
            $scope.updateSavingState({ value: false });
            notify.info('Dashboard Group ' + group.title + ' was successfuly deleted');
            $scope.$emit('kibi:dashboardgroup:changed', group.id);
          })
          .catch(reason => {
            $scope.updateSavingState({ value: false });
            notify.error(reason);
          });
        });
      };

      // This will ensure call the notification event one time per digest.
      $scope.notifyReloadCounts = _.once(() => {
        $scope.$emit('kibi:dashboardgroup:reloadcounts');
      });

      $scope.$watch('filter', (value) => {
        if (value && value.length > 0) {
          $scope.group.collapsed = false;
          $scope.notifyReloadCounts();
        }
      });

      $scope.dashboardIsHighlighted = (dashboard) => {
        return dashboard.$$highlight;
      };

      $scope.doesGroupHaveAnyHighlightedDashboard = function (dashboards) {
        // here iterate over dashboards check if highlighted dashboard exists
        for (let i = 0; i < dashboards.length; i++) {
          if (dashboards[i].$$highlight === true) {
            return true;
          }
        }
        return false;
      };

      $scope.isSidebarOpen = dashboardsNavState.isOpen();
      $scope.$watch(dashboardsNavState.isOpen, isOpen => {
        $scope.isSidebarOpen = isOpen;
      });

      $scope.addTooltip = function (event, reference, isDashboard, includeFilters = false) {
        let title;
        let error;
        let filterMessage = null;
        if (isDashboard) {
          const dashboard = $scope.group.dashboards[+reference];
          title = dashboard.title;
          error = dashboard.error;
          filterMessage = dashboard.filterIconMessage;
          if (dashboard.error !== undefined) {
            title += ' Error: ' + error;
          } else if (dashboard.count !== undefined) {
            title += ' (' + kibiHumanReadableHelper.formatNumber(dashboard.count, '0,000') + ')';
          }
        } else {
          const group = $scope.group;
          title = group.title;
          error = group.selected.error;
          if (group.selected) {
            filterMessage = group.selected.filterIconMessage;
          }
          if (group.virtual && group.selected.error !== undefined) {
            title += ' Error: ' + error;
          } else if (group.virtual && group.selected.count !== undefined) {
            title += ' (' + kibiHumanReadableHelper.formatNumber(group.selected.count, '0,000') + ')';
          }
        }
        $scope.tooltipContent = title + ((filterMessage && includeFilters) ? filterMessage : '');
        const selector = $(event.currentTarget);
        selector.qtip({
          content: {
            prerender: true,
            text: function () {
              return $scope.tooltipContent;
            }
          },
          position: {
            my: 'left center',
            at: 'right center'
          },
          show: {
            event: '',
            solo: true
          },
          hide: {
            event: 'mouseleave'
          },
          style: {
            classes: 'qtip-light qtip-rounded qtip-shadow'
          }
        }).qtip('show');
      };

      function isEllipsisActive(e) {
        return (e.offsetWidth < e.scrollWidth);
      }

      $scope.refreshTooltipIndicator = function (event, reference, isDashboard) {
        let count = 0;
        if (isDashboard) {
          const dashboard = $scope.group.dashboards[+reference];
          if (dashboard.count !== undefined) {
            count = dashboard.count;
          }
        } else {
          const group = $scope.group;
          if (group.selected && group.selected.count !== undefined) {
            count = group.selected.count;
          }
        }
        event.stopPropagation();
        $scope.addTooltip(event, reference, isDashboard);
      };

      $scope.refreshTooltipContent = function (event, reference, isDashboard) {
        const $elem = $(event.currentTarget);
        let $titleElement;
        if (isDashboard) {
          $titleElement = $elem.find('.dashboard-nav-title');
        } else {
          $titleElement = $elem.find('.title');
        }
        if ($titleElement.length > 0 && isEllipsisActive($titleElement[0])) {
          if ($scope.timeoutPromise) {
            $timeout.cancel($scope.timeoutPromise);
          }
          $scope.addTooltip(event, reference, isDashboard);
        }
      };

      $scope.refreshFilterTooltip = function (event, reference, isDashboard) {
        const FILTER_TOOLTIP_SLEEP_TIME = 400;
        $scope.timeoutPromise = $timeout(() => {
          if ($scope.timeoutPromise) {
            $timeout.cancel($scope.timeoutPromise);
          }
          $scope.addTooltip(event, reference, isDashboard, true);
        }, FILTER_TOOLTIP_SLEEP_TIME);
      };

      $scope.hideFilterTooltip = function () {
        if ($scope.timeoutPromise) {
          $timeout.cancel($scope.timeoutPromise);
        }
      };


    }
  };
});
