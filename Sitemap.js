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
            if (event.user) {
                //Get Email Address from querystring
                if (Evergage.util.getParameterByName("subscriberKey") && Evergage.util.getParameterByName("subscriberKey") !== "") {
                    var myEmail = Evergage.util.getParameterByName("subscriberKey");
                    event.user.id = myEmail;
                    event.user.attributes = {EmailAddress: myEmail};
                    console.log ("Setting user.id to: " + myEmail);
                }
                //Get DMP details from local storage
                if (window.localStorage.kxdmpsaprod_kuid) {
                    if (window.localStorage.kxdmpsaprod_allsegs) {
                        event.user.attributes = {kuID: window.localStorage.kxdmpsaprod_kuid, DMPPersona: window.localStorage.kxdmpsaprod_allsegs};
                    } else {
                        event.user.attributes = {kuID: window.localStorage.kxdmpsaprod_kuid};
                    }
                }
            }
            return event;
        },
        listeners: [
            Evergage.listener("submit", ".email-signup", () => {
                var nlEmail = Evergage.cashDom("#dwfrm_mcsubscribe_email").val();
                if (nlEmail) {
                     console.log ("Setting user.id to: " + nlEmail);
                    Evergage.sendEvent({action: "Email Sign Up - Footer", user: {id: nlEmail, email_address:nlEmail, attributes: {EmailAddress: nlEmail}} });
                }
            }),
        ],
    }
    
    config.pageTypes.push({
        name: "Product Page",
        action: "Viewed Item",
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
                    Style: Evergage.resolvers.fromSelectorAttributeMultiple(".color-value", "data-attr-value"),
                    ItemClass: Evergage.resolvers.fromSelectorMultiple(".features .feature", (itemClasses) => {
                        return itemClasses.map((itemClass) => {
                            return itemClass.trim();
                        });
                    })
                }
            }
        },
        onActionEvent: (event) => {
            if (event.user){
                event.user.attributes = { lifeCycleState: "Consideration" };
            }
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
                lineItem._id = Evergage.cashDom(".product-detail[data-pid]").attr("data-pid");
                Evergage.sendEvent({
                    action: "Add Item to Cart - " + lineItem._id,
                    itemAction: Evergage.ItemAction.AddToCart,
                    cart: {
                        singleLine: {
                            Product: lineItem
                        }
                    },
                    user: {
                        attributes: {
                            lifeCycleState: "Consideration"
                        }
                    }
                });
            }),
        ],

    });
    
    config.pageTypes.push({
        name: "Category",
        action: "Viewed Category",
        isMatch: () => {
            return Evergage.cashDom(".page[data-action='Search-Show']").length > 0 && Evergage.cashDom(".breadcrumb").length > 0;
        },
        onActionEvent: (event) => {
            return event;
        },
        catalog: {
            Category: {
                _id: Evergage.resolvers.buildCategoryId(".breadcrumb .breadcrumb-item a", 1, null, (val) => {
                    if (typeof val === "string") {
                        return [val.toUpperCase()];
                    }  
                }),
            }
        }
    });

    config.pageTypes.push({
        name: "Cart",
        action: "Viewed Cart",
        isMatch: () => {
            return /\/cart/.test(window.location.href);
        },
        itemAction: Evergage.ItemAction.ViewCart,
        catalog: {
            Product: {
                lineItems: {                    
                    // TODO: add sku handling
                    //sku: Evergage.resolvers.fromSelectorAttributeMultiple(".product-info .product-details .line-item-quanity-info", "data-pid")
                    _id: Evergage.resolvers.fromSelectorAttributeMultiple(".product-line-item .line-item-quanity-info", "data-pid"),
                    price: Evergage.resolvers.fromSelectorMultiple(".product-info .product-details .pricing"),
                    quantity: Evergage.resolvers.fromSelectorMultiple(".product-info .product-details .qty-card-quantity-count"),
                }
            }
        }
    });

    config.pageTypes.push({
        name: "Order Confirmation",
        action: "Order Confirmation",
        isMatch: () => {
            return /\/confirmation/.test(window.location.href);
        },
        itemAction: Evergage.ItemAction.Purchase,
        catalog: {
            Product: {
                lineItems: {
                    // TODO: add sku handling
                    //sku: Evergage.resolvers.fromSelectorAttributeMultiple(".product-line-item .line-item-quanity-info", "data-pid"),
                    _id: Evergage.resolvers.fromSelectorAttributeMultiple(".product-line-item .line-item-quanity-info", "data-pid"),
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
                            attributes: {EmailAddress: email}
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
        name: "Community Stories",
        action: "Viewed Stories",
        isMatch: () => {
            return  /\/s\/stories/.test(window.location.href);
        }
    });
    
    config.pageTypes.push({
        name: "Community Blog Post",
        action: "Viewed Blog Post",
        isMatch: () => {
            return /\/s\/ntoblog/.test(window.location.href);
        },
        catalog: {
            Blog: {
                _id: () => {
                    var pParts = location.pathname.split("/");
                    //console.log(pParts);
                    var lastPart = "";
                    var pageParts = "";
                    var urlID = "";
                    if (pParts.length > 0) {
                        lastPart = pParts[pParts.length-1];
                        //console.log(lastPart);
                        pageParts = lastPart.split("-");
                        if (pageParts.length > 0) {
                            urlID = pageParts[pageParts.length-1];
                        }
                    }
                    return urlID;
                },
                name: () => document.title.replace(/&nbsp;/g, " ").replace(/\uFFFD/g, ""),
                url: Evergage.resolvers.fromHref(),
                imageUrl: () => { return Evergage.cashDom("#NTO-page > div.body > div > div > div:nth-child(1) > div > div.cb-section_row.slds-grid.slds-wrap.slds-large-nowrap > div > div > div > div > div > div > div.js-content-image.slds-col.slds-m-bottom_medium").css('background-image').slice(4, -1).replace(/"/g, "") || ""},
                description: Evergage.resolvers.fromSelector("#NTO-page > div.body > div > div > div:nth-child(2) > div > div.cb-section_row.slds-grid.slds-wrap.slds-large-nowrap > div > div > div:nth-child(2) > div > div > div > div > lightning-formatted-rich-text > span > p:nth-child(1)"),
            },
            Category: {
                _id: Evergage.resolvers.buildCategoryId("#NTO-page > div.body > div > div > div:nth-child(2) > div > div.cb-section_row.slds-grid.slds-wrap.slds-large-nowrap > div > div > div:nth-child(1) > div > div > div > div > div > ul > li", null, null, (val) => {
                    if (typeof val === "string") {
                        console.log(val);
                        return [val.toUpperCase()];
                    }  
                }),
            }
        },
        onActionEvent: (event) => {
            return event;
        },
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
                            Evergage.sendEvent({action: "Logged In", user: {id: email, attributes: {EmailAddress: email}} });
                        }
                    });  
                }, 500);
            }
            return event;
        },

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
            Evergage.listener("click", "div.topicContent", () => {
                var topicLabel = Evergage.cashDom(event.currentTarget).find(".topicLabel").text().trim();
                console.log("topic label is =" + topicLabel);
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
        listeners: [
            Evergage.listener("click", ".beacon.entrance", () => {
                Evergage.sendEvent({action: "Physical - Store (Entrance)"});
            }),
            Evergage.listener("click", ".beacon.mens", () => {
                Evergage.sendEvent({action: "Physical - Store (Camping)"});
            }),
            Evergage.listener("click", ".beacon.shoes", () => {
                Evergage.sendEvent({action: "Physical - Store (Footwear)"});
                Evergage.sendEvent({action: "Mobile - iOS (In-Store Push)"});
            }),
            Evergage.listener("click", ".iphone-screen.screen-2", () => {
                Evergage.sendEvent({action: "Mobile - iOS (In-Store Push, App Open)"});
            }),
            Evergage.listener("click", ".beacon.register", () => {
                var myOrder = {
                    Product: {
                        orderId: Date.now(),
                        totalValue: 90,
                        currency: "USD",
                        lineItems:[
                            {
                                _id: "2050857",
                                price: 90,   
                                quantity: 1
                            }
                        ]
                    }
                }
                // New ActionEvent
                Evergage.sendEvent({
                    action: "Puchase",
                    itemAction: Evergage.ItemAction.Purchase,
                    order: myOrder,
                    cart: {
                        singleLine: {
                            Product: {
                                _id: "2050857"
                            }
                        }
                    },
                    user: {
                        attributes: {lifeCycleState: "Purchaser"}  
                    } 
                });
            }),

        ]  
    });
    
    
    Evergage.initSitemap(config);
});
