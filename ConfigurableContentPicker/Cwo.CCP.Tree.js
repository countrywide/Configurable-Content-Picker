angular.module("umbraco")
    .controller("Cwo.CCP.Tree", [
        "$scope", "$http", function($scope, $http) {
        var tree = this;
        tree.DocTypes = $scope.model.config.DocTypeId;
        tree.AllowMultipleSelection = $scope.model.config.AllowMulitpleContent === "1";
        tree.Structure = [];
        tree.Loading = true;
        tree.SelectedNodesIds = [];
        tree.SelectedNodeId = "";
        var value = $scope.model.value;
       
        if (value !== "") {
            if (tree.AllowMultipleSelection) {

                if (value.indexOf(",") > -1) {
                    var selectedValues = value.split(",");
                    for (var x = 0; x < selectedValues.length; x++) {
                        tree.SelectedNodesIds.push(Number(selectedValues[x]));
                    }

                } else {
                    tree.SelectedNodesIds.push(Number(value));
                }
            } else {

                //If control has been changed from allowing multiple selection to singular select only 
                //the model value may be an array, if this is the case we need to reset the controls value.
                if (value.indexOf(",") > -1) {
                    tree.SelectedNodeId = "";
                    $scope.model.value = "";
                } else {
                    tree.SelectedNodeId = Number($scope.model.value);
                }
            }
        }

        tree.SelectedNodes = [];
        tree.Errored = false;
        tree.ErrorMessage = "";
        tree.ExceptionMessage = "";
        tree.ShowException = false;
        tree.Message = "";

        tree.GetNodesForDocType = function() {
            tree.Loading = true;
            var selected = "";

            if (tree.AllowMultipleSelection) {
                selected = tree.SelectedNodesIds;
            } else {
                selected = tree.SelectedNodeId;
            }

            $http.get("/app_plugins/ConfigurableContentPicker/CCP.aspx?action=GetContent&DocTypeId=" + tree.DocTypes + "&SelectedContentId=" + selected).success(function(response) {
                tree.ErrorMessage = response.ErrorMessage;
                if (tree.ErrorMessage.length > 0) {
                    tree.ExceptionMessage = response.Exception;
                    tree.Errored = true;
                } else {
                    tree.Errored = false;
                    tree.Message = response.Message;
                    tree.Structure = response.Content;
                    if (tree.AllowMultipleSelection) {
                        if (tree.SelectedNodesIds.length > 0) {
                            //Reset the tree.SelectedNodesIds collection so that it can be repopulated based upon content returned, if 
                            //the collection contained a Node that is no longer available then it would never be removed.
                            tree.SelectedNodesIds = [];
                            tree.SetSelectedNode(tree.Structure);
                            $scope.model.value = tree.SelectedNodesIds.toString();
                        }
                    } else {
                        if (tree.SelectedNodeId != "") {
                            //Reset the tree.SelectedNodeId so that it can be repopulated based upon content returned, if 
                            //tree.SelectedNodeId is for a Node that is no longer available it isn't a valid value.
                            tree.SelectedNodeId = "";
                            tree.SetSelectedNode(tree.Structure);
                            $scope.model.value = tree.SelectedNodeId;
                        }
                    }
                }
                tree.Loading = false;
            });
        };

        tree.SetSelectedNode = function(structure) {
            for (var y = 0; y < structure.length; y++) {
                var node = structure[y];
                if (node.IsSelected) {
                    tree.SelectedNodes.push(node);
                    if (tree.AllowMultipleSelection) {
                        tree.SelectedNodesIds.push(node.Id);
                        tree.SetSelectedNode(node.Children);
                    } else {
                        tree.SelectedNodeId = node.Id.toString();
                    }
                } else {
                    if (node.Children.length > 0) {
                        tree.SetSelectedNode(node.Children);
                    }
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

        tree.SelectNode = function(node) {
            if (tree.AllowMultipleSelection) {
                var nodeIndex = tree.SelectedNodesIds.indexOf(node.Id);
                if (nodeIndex > -1) {
                    tree.SelectedNodesIds.splice(nodeIndex, 1);
                    var selectedNodeIndex = tree.SelectedNodes.indexOf(node);
                    if (selectedNodeIndex > -1) {
                        var selectedNode = tree.SelectedNodes[selectedNodeIndex];
                        selectedNode.IsSelected = false;
                        tree.SelectedNodes.splice(selectedNodeIndex, 1);
                    }
                } else {
                    node.IsSelected = true;
                    tree.SelectedNodesIds.push(node.Id);
                    tree.SelectedNodes.push(node);
                }
                $scope.model.value = tree.SelectedNodesIds.toString();
            } else {

                var singleNodeIndex = tree.SelectedNodes.indexOf(node);
                if (singleNodeIndex > -1) {
                    //Node already selected so we must be deselecting it
                    tree.SelectedNodes[0].IsSelected = false;
                    tree.SelectedNodes = [];
                    tree.SelectedNodeId = "";
                } else {
                    node.IsSelected = true;
                    if (tree.SelectedNodes.length > 0) {
                        tree.SelectedNodes[0].IsSelected = false;
                        tree.SelectedNodes = [];
                    }
                    tree.SelectedNodes.push(node);
                    tree.SelectedNodeId = node.Id.toString();
                }

                $scope.model.value = tree.SelectedNodeId;
            }
        };
        tree.GetNodesForDocType();
    }
]);