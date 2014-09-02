angular.module("umbraco")
    .controller("Cwo.CCP.Settings",
        function ($scope, $http) {
            var settings = this;
            settings.SelectedDocType = $scope.model.value || [];
            settings.DocTypes = [];
            settings.Loading = true;
            settings.Errored = false;
            settings.ErrorMessage = "";
            settings.ExceptionMessage = "";
            settings.ShowException = false;
            
            $http.get("/app_plugins/ConfigurableContentPicker/CCP.aspx?action=GetDocTypes").success(function (response) {
                settings.ErrorMessage = response.ErrorMessage;
                if (settings.ErrorMessage.length > 0) {
                    settings.ExceptionMessage = response.Exception;
                    settings.Errored = true;
                } else {
                    settings.DocTypes = response.DocumentTypes;
                    for (var x = 0; x < response.DocumentTypes.length; x++) {
                        settings.IsChecked(response.DocumentTypes[x]);
                    }

                    settings.Errored = false;
                }
                settings.Loading = false;
            });

            settings.IsChecked = function (docType) {
                docType.IsSelected = settings.SelectedDocType.indexOf(docType.Id) > -1;
            };

            settings.startsWith = function (actual, expected) {
                var lowerStr = (actual + "").toLowerCase();
                return lowerStr.indexOf(expected.toLowerCase()) === 0;
            };

            settings.SelectDocType = function (docType) {
                var docTypeIndex = settings.SelectedDocType.indexOf(docType.Id);
                if (docTypeIndex > -1) {
                    settings.SelectedDocType.splice(docTypeIndex, 1);
                    docType.IsSelected = false;
                } else {
                    settings.SelectedDocType.push(docType.Id);
                    docType.IsSelected = true;
                }
                $scope.model.value = settings.SelectedDocType;
            };
        });