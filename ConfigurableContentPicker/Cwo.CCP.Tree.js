angular.module("umbraco")
    .controller("Cwo.CCP.Tree", [
        "$scope", "$http", function($scope, $http) {
        var tree = this;
        tree.DocTypes = $scope.model.config.DocTypeId;
        tree.AllowMultipleSelection = $scope.model.config.AllowMulitpleContent === "1";
        tree.Structure = [];
        tree.Loading = false;
        tree.SelectedNodesIds = [];
        tree.RetrievedTree = false;
        tree.ShowTree = false;
        tree.LoadingSelectedDetails = false;
        tree.SelectedNodes = [];
        tree.Errored = false;
        tree.ErrorMessage = "";
        tree.ExceptionMessage = "";
        tree.ShowException = false;
        tree.Message = "";

        var value = $scope.model.value;
      
        if (value !== "") {
            if (value.indexOf(",") > -1) {
                var selectedValues = value.split(",");
                for (var x = 0; x < selectedValues.length; x++) {
                    tree.SelectedNodesIds.push(Number(selectedValues[x]));
                }
            } else {
                tree.SelectedNodesIds.push(Number(value));
            }
        }

        if (!tree.AllowMultipleSelection && tree.SelectedNodesIds.length > 1) {
            tree.SelectedNodesIds = [];
            tree.SelectedNodes = [];
        }

        tree.GetSelectedDetails = function() {
            var selected = tree.SelectedNodesIds;
            tree.LoadingSelectedDetails = true;
            $http.get("/app_plugins/ConfigurableContentPicker/CCP.aspx?action=GetSelectedDetails&SelectedContentId=" + selected).success(function(response) {
                tree.ErrorMessage = response.ErrorMessage;
                if (tree.ErrorMessage.length > 0) {
                    tree.ExceptionMessage = response.Exception;
                    tree.Errored = true;
                } else {
                    tree.Errored = false;
                    tree.SelectedNodes = response.Content;
                    for (var a = 0; a < tree.SelectedNodes.length; a++) {
                        var node = tree.SelectedNodes[a];
                        node.IconHtml = tree.GetIcon(node.Icon);
                    }
                }
                tree.LoadingSelectedDetails = false;
            });
        };

        tree.GetNodesForDocType = function() {
            tree.Loading = true;
            var selected = "";
            selected = tree.SelectedNodesIds;

            $http.get("/app_plugins/ConfigurableContentPicker/CCP.aspx?action=GetContent&DocTypeId=" + tree.DocTypes + "&SelectedContentId=" + selected).success(function(response) {
                tree.ErrorMessage = response.ErrorMessage;
                if (tree.ErrorMessage.length > 0) {
                    tree.ExceptionMessage = response.Exception;
                    tree.Errored = true;
                } else {
                    tree.Errored = false;
                    tree.Message = response.Message;
                    tree.Structure = response.Content;

                    //reset the SelectedNodes collection so that we can tie it up to the nodes in the tree. Current values would be populated by the GetSelectedDetails method call and
                    //so wouldnt be able to refernece the same nodes as appearing in the tree.  We need to reference the nodes in the tree to support the selection higlighting.
                    tree.SelectedNodes = [];
                    tree.SelectedNodesIds = [];
                    tree.SetSelectedNode(tree.Structure);
                }
                tree.Loading = false;
                tree.RetrievedTree = true;
            });
        };

        tree.SetSelectedNode = function(structure) {
            for (var y = 0; y < structure.length; y++) {
                var node = structure[y];
                node.IconHtml = tree.GetIcon(node.Icon);
                if (node.IsSelected) {
                    tree.SelectedNodes.push(node);
                    tree.SelectedNodesIds.push(node.Id);
                }
                if (node.Children.length > 0) {
                    tree.SetSelectedNode(node.Children);
                }
            }
        };

        tree.ExpandNode = function(node) {
            var expanding = !node.IsExpanded;
            node.IsExpanded = expanding;
            if (!$scope.$root.$$phase) {
                $scope.$apply();
            }
        };

        tree.SelectNode = function (node) {
            var alreadySelected = tree.RemoveAlreadySelectedNode(node.Id);
            //if not alreadySelected, and so is actually being deselected, add the new node to the selected collection
            if (!alreadySelected) {
                node.IsSelected = true;
                if (!tree.AllowMultipleSelection) {
                    tree.SelectedNodesIds = [];
                    if (tree.SelectedNodes.length > 0) {
                        tree.SelectedNodes[0].IsSelected = false;
                    }
                    tree.SelectedNodes = [];
                }
                tree.SelectedNodesIds.push(node.Id);
                tree.SelectedNodes.push(node);
              
            } else {
                node.IsSelected = false;
            }
            $scope.model.value = tree.SelectedNodesIds.toString();
        };

        tree.RemoveAlreadySelectedNode = function(nodeId) {
            var index = 0;
            var alreadySelected = false;
            for (var s = 0; s < tree.SelectedNodes.length; s++) {
                var node = tree.SelectedNodes[s];
                if (node.Id === nodeId) {
                    node.IsSelected = false;
                    tree.SelectedNodes.splice(index, 1);
                    alreadySelected = true;
                }
                index++;
            }
            if (alreadySelected) {
                index = 0;
                for (var p = 0; p < tree.SelectedNodesIds.length; p++) {
                    if (tree.SelectedNodesIds[p] === nodeId) {
                        tree.SelectedNodesIds.splice(index, 1);
                    }
                    index++;
                }
            }
            return alreadySelected;
        };

        tree.GetIcon = function (icon) {
            var response = "";
            if (icon) {
                if (icon.endsWith(".jpg") || icon.endsWith(".png") || icon.endsWith(".gif") || icon.endsWith(".ico")) {
                    response = '<img src="/umbraco/images/umbraco/' + icon + '" class="nodeImage" />';
                } else if (icon === ".sprTreeDoc") {
                    response = '<i class="icon-document"></i>';
                } else if (icon === ".sprTreeFolder") {
                    response = '<i class="icon-folder"></i>';
                } else {
                    response = '<i class="' + icon + '"></i>';
                }
            }
            return response;
        };

        tree.ShowTreeAction = function () {
            if (!tree.RetrievedTree) {
                tree.GetNodesForDocType();
            }
            tree.ShowTree = true;
        };

        tree.GetSelectedDetails();
    }
]);