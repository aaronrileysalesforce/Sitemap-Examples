var allowedDomains = [
	"community.northerntrailoutfitters.com",
	"www.northerntrailoutfitters.com",
	"ntoretail.com",
	"marvelapp.com",
	"community.ntoretail.com",
	"ntoretailforce.my.salesforce.com"
];

(allowedDomains.indexOf(window.location.hostname) >= 0) && Evergage.init({
    cookieDomain: "northerntrailoutfitters.com"
}).then(function(state) {

            
    var config = {
        global: {},
        pageTypes: []
    };
    
    const getProductsFromDataLayer = () => {
        if (window.dataLayer) {
            for (var i = 0; i < window.dataLayer.length; i++) {
                if ((window.dataLayer[i].ecommerce && window.dataLayer[i].ecommerce.detail || {}).products) {
                    return window.dataLayer[i].ecommerce.detail.products;
                }
            }
        }
    };
    
    config.global = {
        contentZones: [
            {name: "Infobar - Top of Page", selector: "header.site-header"},
            {name: "Infobar - Bottom of Page", selector: "footer.site-footer"}
        ],
        onActionEvent: (event) => {
            if (!event.name) {
                event.name = Evergage.getState().result.currentPage.name;
            }
            //Get Email Address from querystring
            if (Evergage.util.getParameterByName("subscriberKey") && Evergage.util.getParameterByName("subscriberKey") !== "") {
                event.user.id = Evergage.util.getParameterByName("subscriberKey");
                event.user.attributes.emailAddress = Evergage.util.getParameterByName("subscriberKey");
            }
            //Get DMP details from local storage
            if (window.localStorage.kxdmpsaprod_kuid) {
                event.user.attributes.kuID = window.localStorage.kxdmpsaprod_kuid;
                if (window.localStorage.kxdmpsaprod_allsegs) {
                    event.user.attributes.DMPPersona = window.localStorage.kxdmpsaprod_allsegs;
                }
            }

            return event;
        },
        listeners: [
            Evergage.listener("submit", ".email-signup", () => {
                var email = Evergage.cashDom("#dwfrm_mcsubscribe_email").val();
                if (email) {
                    Evergage.sendEvent({action: "Email Sign Up - Footer", user: {id: email} });
                }
            }),
        ],
    }
    
    config.pageTypes.push({
        name: "Product Page",
        isMatch: Evergage.resolvers.fromSelector("div.page[data-action='Product-Show']"),
        catalog: {
            Product: {
                _id: () => {
                    var products = getProductsFromDataLayer();
                    if (products.length > 0) {
                        return products[0].id;
                    }
                },
                name: Evergage.resolvers.fromJsonLd("name", val => {
                    return val.replace(/’/g, "'") // temp base64 solution
                }),
                description: Evergage.resolvers.fromSelector(".short-description", val => {
                    return val.replace(/’/g, "'") // temp base64 solution
                }),
                url: Evergage.resolvers.fromHref(),
                imageUrl: Evergage.resolvers.fromSelectorAttribute(
                    ".product-carousel .carousel-item[data-slick-index='0'] img",
                    "src"
                ),
                inventoryCount: 1,
                price: Evergage.resolvers.fromSelector(".prices .price .value"),
                rating: () => {
                    return Evergage.util.extractFirstGroup(/([.\w]+) out of/, Evergage.cashDom(".ratings .sr-only").text());
                },
                categories: Evergage.resolvers.buildCategoryId(".container .product-breadcrumb .breadcrumb a", null, null, (val) => {
                    if (typeof val === "string") {
                        return [val.toUpperCase()];
                    }  
                }),
                dimensions: {
                    Gender: () => {
                        if (Evergage.cashDom(".product-breadcrumb .breadcrumb a").first().text().toLowerCase() === "women" ||
                            Evergage.cashDom("h1.product-name").text().indexOf("Women") >= 0) {
                                return ["WOMEN"];
                        } else if (Evergage.cashDom(".product-breadcrumb .breadcrumb a").first().text().toLowerCase() === "men" ||
                            Evergage.cashDom("h1.product-name").text().indexOf("Men") >= 0) {
                                return ["MEN"];
                        }
                    },
                    Color: Evergage.resolvers.fromSelectorAttributeMultiple(".color-value", "data-attr-value"),
                    Feature: Evergage.resolvers.fromSelectorMultiple(".features .feature", (itemClasses) => {
                        return itemClasses.map((itemClass) => {
                            return itemClass.trim();
                        });
                    })
                }
            }
        },
        onActionEvent: (event) => {
            event.user.attributes ? event.user.attributes.lifeCycleState = "Consideration" : event.user.attributes = { lifeCycleState: "Consideration" };
            return event;
        },
        contentZones: [
            { name: "PDP Recs Row 1", selector: ".row.recommendations div[id*='cq']:nth-of-type(1)"},
            { name: "PDP Recs Row 2", selector: ".row.recommendations div[id*='cq']:nth-of-type(2)"},
        ],
        listeners: [
            Evergage.listener("click", ".add-to-cart", () => {
                var lineItem = Evergage.util.buildLineItemFromPageState("select[id*=quantity]");
                // TODO: add sku handling
                //lineItem.sku = Evergage.cashDom(".product-detail[data-pid]").attr("data-pid");
                Evergage.sendEvent({
                    itemAction: Evergage.ItemAction.AddToCart,
                    cart: {
                        singleLine: {
                            Product: lineItem
                        }
                    }
                });
            }),
        ],

    });
    
    config.pageTypes.push({
        name: "Category",
        isMatch: () => {
            return Evergage.cashDom(".page[data-action='Search-Show']").length > 0 && Evergage.cashDom(".breadcrumb").length > 0;
        },
        catalog: {
            Category: {
                _id: Evergage.resolvers.buildCategoryId(".breadcrumb .breadcrumb-item a", 1)
            }
        }
    });

    config.pageTypes.push({
        name: "Cart",
        isMatch: () => {
            return /\/cart/.test(window.location.href);
        },
        itemAction: Evergage.ItemAction.ViewCart,
        catalog: {
            Product: {
                lineItems: {                    
                    // TODO: add sku handling
                    //sku: Evergage.resolvers.fromSelectorAttributeMultiple(".product-info .product-details .line-item-quanity-info", "data-pid")
                    price: Evergage.resolvers.fromSelectorMultiple(".product-info .product-details .pricing"),
                    quantity: Evergage.resolvers.fromSelectorMultiple(".product-info .product-details .qty-card-quantity-count"),
                }
            }
        }
    });

    config.pageTypes.push({
        name: "Order Confirmation",
        isMatch: () => {
            return /\/confirmation/.test(window.location.href);
        },
        itemAction: Evergage.ItemAction.Purchase,
        catalog: {
            Product: {
                lineItems: {
                    // TODO: add sku handling
                    //sku: Evergage.resolvers.fromSelectorAttributeMultiple(".product-line-item .line-item-quanity-info", "data-pid"),
                    price: Evergage.resolvers.fromSelectorMultiple(".product-line-item .pricing"),
                    quantity: Evergage.resolvers.fromSelectorMultiple(".product-line-item .qty-card-quantity-count")   
                }
            }
        }
    });

    config.pageTypes.push({
        name: "Community Login",
        action: "Community Login",
        isMatch: () => {
            return /\/s\/login/.test(window.location.href);
        },
        listeners: [
            Evergage.listener("click", ".loginButton", () => {
                var email = Evergage.cashDom("#sfdc_username_container > div > input").val();
                console.log(email + "is the evergage email");
                if (email) {
                    Evergage.sendEvent({
                        action: "Community Log In", 
                        user: {
                            id: email, 
                            attributes: {emailAddress: email}
                        },
                        flags: {
                            noCampaigns: true
                        }
                    });
                }
            }),
        ]
    });
    
    config.pageTypes.push({
        name: "Login",
        action: "Login",
        isMatch: () => {
            return /\/login/.test(window.location.href) && !/\/s\/login/.test(window.location.href);
        },
        onActionEvent: (event) => {
            if (event.action === "Login") {
                window.setTimeout(() => {
                    Evergage.cashDom("form[name='login-form'] button").on("click", () => {
                        var email = Evergage.cashDom("#login-form-email").val();
                        if (email) {
                            Evergage.sendEvent({action: "Logged In", user: {id: email} });
                        }
                    });  
                }, 500);
            }
            return event;
        },
        /*
        listeners: [
            Evergage.listener("click", "form[name='login-form'] button", () => {
                var email = Evergage.cashDom("#login-form-email").val();
                if (email) {
                    Evergage.sendEvent({
                        action: "Community Logged In", 
                        user: {
                            id: email, 
                            attributes: {emailAddress: email}
                        },
                        flags: {
                            noCampaigns: true
                        }
                    });
                }
            }),
        ]*/

    });

    config.pageTypes.push({
        name: "Homepage",
        action: "Homepage",
        isMatch: () => {
            return /\/homepage/.test(window.location.href);
        },
        contentZones: [
            {name: "Homepage | Hero", selector: ".experience-carousel-bannerCarousel"},
            {name: "Homepage | CTA", selector: ".experience-component[data-slick-index='0'] .hero-banner-overlay-inner"},
            {name: "Homepage | Sub Hero", selector: "body > div.page > section > div.experience-region.experience-main > div:nth-child(1)"},
            {name: "Homepage | Product Recommendations", selector: "div.experience-region.experience-main > div:nth-child(2)"},
            {name: "Homepage | Popup"},
            {name: "Featured Categories", selector: ".experience-component.experience-layouts-3_column"},
            {name: "Search Bar", selector: "nav form[role='search']"}
        ]
        
    });

    config.pageTypes.push({
        name: "Community Homepage",
        action: "Community Homepage",
        isMatch: () => {
            return window.location.hostname === "community.northerntrailoutfitters.com" 
                && /\/s/.test(window.location.pathname) 
                && !/\/login/.test(window.location.href);
        },
        onActionEvent: (event) => {
           return event;
        },
        listeners: [
            Evergage.listener("click", "li.topicItem", () => {
                var topicLabel = Evergage.cashDom(e.currentTarget).find(".topicLabel").text().trim();
                //console.log("topic label is =" + topicLabel);
                if (topicLabel) {
                    Evergage.sendEvent({ action: "Community Homepage - " + topicLabel });
                }
            }),
        ]
    });
    
    config.pageTypes.push({
        name: "In Store Experience",
        action: "In Store Experience",
        isMatch: function() {
            return /\/instore-experience/.test(window.location.href);
        },
        onActionEvent: function(event) {
            if (event.name !== "In Store Experience") {
                return event;
            }
            Evergage.cashDom(".beacon.entrance").on("click", function() {
                Evergage.sendEvent({action: "Physical - Store (Entrance)"});
            });
            Evergage.cashDom(".beacon.mens").on("click", function() {
                Evergage.sendEvent({action: "Physical - Store (Camping)"});
            });
            Evergage.cashDom(".beacon.register").on("click", function() {
                var order = {
                    orderId: Date.now(),
                    lineItems: [
                        {
                            item: {
                                type: "p",
                                _id: "2050857",
                                price: 90   
                            },
                            quantity: 1
                        }
                    ]
                };
                //Evergage.sendEvent({order, itemAction: Evergage.ItemAction.Purchase, attributes: {lifeCycleState: "Purchaser"} });
                // New ActionEvent
                Evergage.sendEvent({
                    order,
                    itemAction: Evergage.ItemAction.Purchase,
                    user: {
                        attributes: {lifeCycleState: "Purchaser"}  
                    } 
                });
            });
            Evergage.cashDom(".beacon.shoes").on("click", function() { Evergage.sendEvent({action: "Physical - Store (Footwear)"});
            Evergage.sendEvent({action: "Mobile - iOS (In-Store Push)"});
            Evergage.cashDom(".iphone-screen.screen-2").on("click", function() {
                    Evergage.sendEvent({action: "Mobile - iOS (In-Store Push, App Open)"}); 
                });
            });
        }
    });
    
    
    Evergage.initSitemap(config);
});
