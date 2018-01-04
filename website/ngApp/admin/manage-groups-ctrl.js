var Ally;
(function (Ally) {
    var GroupEntry = /** @class */ (function () {
        function GroupEntry() {
        }
        return GroupEntry;
    }());
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    var ManageGroupsController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ManageGroupsController($timeout, $http) {
            this.$timeout = $timeout;
            this.$http = $http;
            this.newAssociation = new GroupEntry();
            this.changeShortNameData = {};
            /**
             * Retrieve the active group list
             */
            this.retrieveGroups = function () {
                this.isLoading = true;
                var innerThis = this;
                this.$http.get("/api/Association/adminList").then(function (response) {
                    innerThis.isLoading = false;
                    innerThis.groups = response.data;
                    // Add the app type string
                    _.each(innerThis.groups, function (g) {
                        if (g.appName === 0) {
                            g.appNameString = "Condo";
                            g.baseUrl = "https://" + g.shortName + ".CondoAlly.com/";
                        }
                        else if (g.appName === 1) {
                            g.appNameString = "NeighborhoodWatch";
                            g.baseUrl = "https://" + g.shortName + ".WatchAlly.com/";
                        }
                        else if (g.appName === 2) {
                            g.appNameString = "Home";
                            g.baseUrl = "https://" + g.shortName + ".HomeAlly.org/";
                        }
                        else if (g.appName === 3) {
                            g.appNameString = "Hoa";
                            g.baseUrl = "https://" + g.shortName + ".HoaAlly.org/";
                        }
                        else if (g.appName === 4) {
                            g.appNameString = "Neighborhood";
                            g.baseUrl = "https://" + g.shortName + ".NeighborhoodAlly.org/";
                        }
                    });
                }, function () {
                    innerThis.isLoading = false;
                    alert("Failed to retrieve groups");
                });
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageGroupsController.prototype.$onInit = function () {
        };
        /**
         * Change a group's short name
         */
        ManageGroupsController.prototype.changeShortName = function () {
            // Make sure the new short name is only letters and numbers and lower case
            if (/[^a-zA-Z0-9]/.test(this.changeShortNameData.newShortName)) {
                alert("The new short name must be alphanumeric");
                return;
            }
            if (this.changeShortNameData.newShortName !== this.changeShortNameData.newShortName.toLowerCase()) {
                alert("The new short name must be lower-case");
                return;
            }
            if (this.changeShortNameData.newShortName.length === 0) {
                alert("New short name must not be empty");
                return;
            }
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/AdminHelper/ChangeShortName?oldShortName=" + this.changeShortNameData.old + "&newShortName=" + this.changeShortNameData.newShortName, null).success(function (data) {
                innerThis.isLoading = false;
                innerThis.retrieveGroups();
            }).error(function () {
                innerThis.isLoading = false;
                alert("Failed to change short name");
            });
        };
        /**
         * Find the groups to which a user, via e-mail address, belongs
         */
        ManageGroupsController.prototype.findAssociationsForUser = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Admin/findAssociationsForUser?email=" + this.findUserAssociationsEmail).then(function (response) {
                innerThis.isLoading = false;
                innerThis.foundUserAssociations = response.data;
            }, function () {
                innerThis.isLoading = false;
                alert("Failed to find associations for user");
            });
        };
        /**
         * Delete a CHTN group
         */
        ManageGroupsController.prototype.deleteAssociation = function (association) {
            if (!confirm("Are you sure you want to delete this association?"))
                return;
            this.isLoading = true;
            var innerThis = this;
            this.$http.delete("/api/Association/chtn/" + association.groupId).then(function () {
                innerThis.isLoading = false;
                innerThis.retrieveGroups();
            }, function (error) {
                innerThis.isLoading = false;
                console.log(error.data.exceptionMessage);
                alert("Failed to delete group: " + error.data.exceptionMessage);
            });
        };
        /**
         * Add an address to full address
         */
        ManageGroupsController.prototype.addAddress = function () {
            this.newAddressId = null;
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/AdminHelper/AddAddress?address=" + encodeURIComponent(this.newAddress), null).success(function (response) {
                innerThis.isLoading = false;
                innerThis.newAddressId = response.data.newAddressId;
            }).error(function (response) {
                innerThis.isLoading = false;
                alert("Failed to add address: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to create a new association
         */
        ManageGroupsController.prototype.onCreateAssociationClick = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/Association", this.newAssociation).then(function () {
                innerThis.isLoading = false;
                innerThis.newAssociation = new GroupEntry();
                innerThis.retrieveGroups();
            });
        };
        ManageGroupsController.prototype.onSendTestEmail = function () {
            this.makeHelperRequest("/api/AdminHelper/SendTestEmail?testEmailRecipient=" + encodeURIComponent(this.testEmailRecipient));
        };
        ManageGroupsController.prototype.onSendTaylorTestEmail = function () {
            this.makeHelperRequest("/api/AdminHelper/SendFromTaylorEmail?testEmailRecipient=" + encodeURIComponent(this.testTaylorEmailRecipient));
        };
        ManageGroupsController.prototype.onSendTestPostmarkEmail = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/AdminHelper/SendTestPostmarkEmail?email=" + this.testPostmarkEmail).success(function () {
                innerThis.isLoading = false;
                alert("Successfully sent email");
            }).error(function () {
                innerThis.isLoading = false;
                alert("Failed to send email");
            });
        };
        ManageGroupsController.prototype.makeHelperRequest = function (apiPath, postData) {
            if (postData === void 0) { postData = null; }
            this.isLoadingHelper = true;
            var request;
            if (postData)
                request = this.$http.post(apiPath, postData);
            else
                request = this.$http.get(apiPath);
            var innerThis = this;
            request.then(function () { return innerThis.isLoadingHelper = false; }, function () { innerThis.isLoadingHelper = false; alert("Failed"); });
        };
        ManageGroupsController.prototype.onTestException = function () {
            this.makeHelperRequest("/api/Association/testException");
        };
        ManageGroupsController.prototype.onClearElmahLogs = function () {
            this.makeHelperRequest("/api/Admin/clearElmah");
        };
        ManageGroupsController.prototype.onClearAppGroupCache = function () {
            this.makeHelperRequest("/api/AdminHelper/ClearGroupCache");
        };
        ManageGroupsController.prototype.onSendInactiveGroupsMail = function () {
            var postData = {
                shortNameLines: this.inactiveShortNames
            };
            this.makeHelperRequest("/api/AdminHelper/SendInactiveGroupsMail", postData);
        };
        ManageGroupsController.$inject = ["$timeout", "$http"];
        return ManageGroupsController;
    }());
    Ally.ManageGroupsController = ManageGroupsController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageGroups", {
    templateUrl: "/ngApp/admin/manage-groups.html",
    controller: Ally.ManageGroupsController
});