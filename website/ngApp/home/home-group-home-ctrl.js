var Ally;
(function (Ally) {
    /**
     * The controller for the Home Ally home page
     */
    var HomeGroupHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HomeGroupHomeController($http, $rootScope, siteInfo, $timeout, appCacheService, fellowResidents) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
            this.fellowResidents = fellowResidents;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HomeGroupHomeController.prototype.$onInit = function () {
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if (!this.homeRightColumnType)
                this.homeRightColumnType = "localnews";
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            this.allyAppName = AppConfig.appName;
            var MaxNumRecentPayments = 6;
            this.recentPayments = this.siteInfo.userInfo.recentPayments;
            if (this.recentPayments) {
                if (this.recentPayments.length > MaxNumRecentPayments)
                    this.recentPayments = this.recentPayments.slice(0, MaxNumRecentPayments);
                this.numRecentPayments = this.recentPayments.length;
                // Fill up the list so there's always MaxNumRecentPayments
                while (this.recentPayments.length < MaxNumRecentPayments)
                    this.recentPayments.push({});
            }
            // The object that contains a message if the user wants to send one out
            this.messageObject = { recipientType: "everyone" };
            // If the user lives in a unit and assessments are enabled
            if (this.siteInfo.privateSiteInfo.assessmentFrequency !== null
                && this.siteInfo.userInfo.usersUnits !== null
                && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.paymentInfo.paymentType = "periodic";
                if (this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";
                    this.nextPaymentText = this.getNextPaymentText(this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue, this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
            this.refreshData();
        };
        // Refresh the not text for the payment field
        HomeGroupHomeController.prototype.updatePaymentText = function () {
            if (this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                // If we have a next payment string
                if (!HtmlUtil.isNullOrWhitespace(this.nextPaymentText)) {
                    if (this.siteInfo.userInfo.usersUnits[0].includesLateFee)
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";
                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else {
                this.paymentInfo.note = "";
            }
        };
        HomeGroupHomeController.prototype.onSelectPaymentType = function (paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType === "periodic" ? this.siteInfo.userInfo.assessmentAmount : 0;
            this.updatePaymentText();
        };
        HomeGroupHomeController.prototype.getNextPaymentText = function (payPeriods, assessmentFrequency) {
            if (payPeriods === null)
                return "";
            // Ensure the periods is an array
            if (payPeriods.constructor !== Array)
                payPeriods = [payPeriods];
            var paymentText = "";
            var frequencyInfo = FrequencyIdToInfo(assessmentFrequency);
            for (var periodIndex = 0; periodIndex < payPeriods.length; ++periodIndex) {
                var curPeriod = payPeriods[periodIndex];
                if (frequencyInfo.intervalName === "month") {
                    var monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
                    paymentText = monthNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "quarter") {
                    var quarterNames = ["Q1", "Q2", "Q3", "Q4"];
                    paymentText = quarterNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "half-year") {
                    var halfYearNames = ["First Half", "Second Half"];
                    paymentText = halfYearNames[curPeriod.period - 1];
                }
                paymentText += " " + curPeriod.year;
                this.paymentInfo.paysFor = [curPeriod];
            }
            return paymentText;
        };
        HomeGroupHomeController.prototype.hideFirstVisit = function () {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        };
        HomeGroupHomeController.prototype.onIncorrectPayDetails = function () {
            // Create a message to the board
            this.messageObject.recipientType = "board";
            if (this.knowsNextPayment)
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " will cover " + this.nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + this.siteInfo.userInfo.assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page from the server
        ///////////////////////////////////////////////////////////////////////////////////////////////
        HomeGroupHomeController.prototype.refreshData = function () {
            //window.location.host is subdomain.domain.com
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            // A little test to help the automated tests run faster
            var isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false;
            if (!isTestSubdomain && this.homeRightColumnType === "localnews") {
                this.isLoading_LocalNews = true;
                var localNewsUri;
                var queryParams;
                if (this.siteInfo.privateSiteInfo.country === "US") {
                    localNewsUri = "https://localnewsally.org/api/LocalNews";
                    queryParams = {
                        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                        chicagoWard: this.siteInfo.publicSiteInfo.chicagoWard,
                        zipCode: this.siteInfo.publicSiteInfo.zipCode,
                        cityNeighborhood: this.siteInfo.publicSiteInfo.localNewsNeighborhoodQuery
                    };
                }
                else {
                    localNewsUri = "https://localnewsally.org/api/LocalNews/International/MajorCity";
                    queryParams = {
                        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                        countryCode: this.siteInfo.privateSiteInfo.country,
                        city: this.siteInfo.privateSiteInfo.groupAddress.city
                    };
                }
                var innerThis = this;
                this.$http.get(localNewsUri, {
                    cache: true,
                    params: queryParams
                }).then(function (httpResponse) {
                    innerThis.localNews = httpResponse.data;
                    innerThis.isLoading_LocalNews = false;
                });
            }
            // If the user can send e-mail, populate the availble groups we can send to
            if (this.canSendEmail) {
                this.isLoadingEmail = true;
                var innerThis = this;
                this.fellowResidents.getGroupEmailObject().then(function (emailList) {
                    innerThis.isLoadingEmail = false;
                    // Find the non-empty groups
                    var emailGroupKeys = _.keys(emailList);
                    var nonEmptyRecipientTypes = [];
                    for (var i = 0; i < emailGroupKeys.length; ++i) {
                        var groupKey = emailGroupKeys[i];
                        if (emailList[groupKey].length > 0)
                            nonEmptyRecipientTypes.push(groupKey);
                    }
                    var displayNames = {
                        "everyone": "Everyone",
                        "owners": "Owners",
                        "renters": "Renters",
                        "board": "Board Members",
                        "residentOwners": "Resident Owners",
                        "nonResidentOwners": "Non-Resident Owners",
                        "residentOwnersAndRenters": "Resident Owners And Renters",
                        "propertyManagers": "Property Managers"
                    };
                    // Create the list used by the UI
                    innerThis.availableEmailGroups = [];
                    for (var j = 0; j < nonEmptyRecipientTypes.length; ++j) {
                        var newEntry = {
                            recipientType: nonEmptyRecipientTypes[j],
                            displayName: displayNames[nonEmptyRecipientTypes[j]]
                        };
                        this.availableEmailGroups.push(newEntry);
                    }
                    innerThis.messageObject.recipientType = innerThis.availableEmailGroups[0].recipientType;
                });
            }
        };
        HomeGroupHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService", "fellowResidents"];
        return HomeGroupHomeController;
    }());
    Ally.HomeGroupHomeController = HomeGroupHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("homeGroupHome", {
    templateUrl: "/ngApp/home/home-group-home.html",
    controller: Ally.HomeGroupHomeController
});