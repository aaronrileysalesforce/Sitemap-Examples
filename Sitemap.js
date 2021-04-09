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
    const config = {
        global: {
            contentZones: [
                {name: "Infobar - Top of Page", selector: "header.site-header"},
                {name: "Infobar - Bottom of Page", selector: "footer.site-footer"}
            ],
            onActionEvent: (event) => {
                //HoloApp integration
                if (window.evgIsHoloapp === true) {
                	var holoappAction = event.action || event.source && event.source.pageType || "Other Screen";
                
                	if(!holoappAction.startsWith("iosApp")){
                		event.action = 'iosApp: ' + holoappAction;
                		event.source = {channel: 'iosApp'};
                		if(window.evgHoloappUserId){
                			event.user = event.user || {};
                			event.user.id = window.evgHoloappUserId;
                			// Do we want to map to salesforceContactId and/or emailAddress
                		}
                	}
                	else return null;
                }

                if (event.user) {
                    //Get Email Address from querystring
                    var myEmail = Evergage.util.getParameterByName("subscriberKey");
                    if (myEmail) {
                        event.user.id = myEmail;
                        event.user.attributes = {emailAddress: myEmail};
                        console.log ("Setting user.id to: " + myEmail);
                    } else {
                        myEmail = Evergage.util.getValueFromNestedObject("window._etmc.user_info.email");
                        if (myEmail) {
                            event.user.id = myEmail;
                            event.user.attributes = {emailAddress: myEmail};
                            console.log ("Setting user.id to: " + myEmail);
                        }
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
                        console.log ("Setting user.id to from Newsletter Signup: " + nlEmail);
                        Evergage.sendEvent({
                                action: "Email Sign Up - Footer", 
                                user: {
                                    id: nlEmail, 
                                    attributes: {emailAddress: nlEmail}
                                },
                                flags: {
                                    noCampaigns: true
                                }
                            });
                    }
                }),
            ],
        },
        pageTypes: [
            {
                name: "Product Page",
                action: "Viewed Item",
                //isMatch: Evergage.resolvers.fromSelector("div.page[data-action='Product-Show']"),
                isMatch: () => {
                    return Evergage.cashDom("div.page[data-action='Product-Show']").length > 0;
                },
                catalog: {
                    Product: {
                        _id: () => {
                            const products = getProductsFromDataLayer();
                            if (typeof products != "undefined" && products.length > 0) {
                                return products[0].id;
                            } else {
                                return Evergage.cashDom("span.product-id").text();
                            }
                        },
                        sku: { _id: Evergage.cashDom(".product-detail[data-pid]").attr("data-pid") },
                        name: Evergage.resolvers.fromJsonLd("name", val => {
                            return val.replace(/’/g, "'") 
                        }),
                        description: Evergage.resolvers.fromSelector(".short-description"),
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
                        categories: Evergage.resolvers.buildCategoryId(".container .product-breadcrumb .breadcrumb a", null, null, (categoryId) => [categoryId.toUpperCase()]),
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
                contentZones: [
                    { name: "PDP Recs Container", selector: "div.row.recommendations > div"},
                    { name: "PDP Social", selector: ".product-availability"}
                ],
                listeners: [
                    Evergage.listener("click", ".add-to-cart", () => {
                        const lineItem = Evergage.util.buildLineItemFromPageState("select[id*=quantity]");
                        lineItem.sku = {_id: Evergage.cashDom(".product-detail[data-pid]").attr("data-pid")};
                        Evergage.sendEvent({
                            action: "Added to Cart", 
                            itemAction: Evergage.ItemAction.AddToCart,
                            cart: {
                                singleLine: {
                                    Product: lineItem
                                }
                            }
                        }); 
                    }),
                    Evergage.listener("click", ".attribute", (event) => {
                        let classList = event.target.classList.value.split(" ");
                        if (classList.includes("color-value") || classList.includes("size-value")) {
                            Evergage.sendEvent({
                                itemAction: Evergage.ItemAction.ViewItemDetail,
                                catalog: {
                                    Product: {
                                        _id: Evergage.util.buildLineItemFromPageState("select[id*=quantity]")._id,
                                        sku: { _id: Evergage.cashDom(".product-detail[data-pid]").attr("data-pid") },
                                        dimensions: {
                                            Color: [Evergage.cashDom(".color-value.selected").attr("data-attr-value")]
                                        }
                                    }
                                }                                
                            });
                        }
                    })
                ],
            },
            {
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
                        _id: Evergage.resolvers.buildCategoryId(".breadcrumb .breadcrumb-item a", 1, null, (categoryId) => categoryId.toUpperCase()),
                    }
                },
                listeners: [
                    Evergage.listener("click", ".quickview", (e) => {
                        const pid = Evergage.cashDom(e.target).attr("href").split("pid=")[1];
                        if (!pid) {
                            return;
                        }
        
                        Evergage.sendEvent({
                            action: "Category Page Quick View",
                            itemAction: Evergage.ItemAction.QuickViewItem,
                            catalog: {
                                Product: {
                                    _id: pid
                                }
                            }
                        });
                    }),
                    Evergage.listener("click", "body", (e) => {
                        if (Evergage.cashDom(e.target).closest("button[data-dismiss='modal']").length > 0) {
                            Evergage.sendEvent({
                                action: "Close Quick View",
                                itemAction: Evergage.ItemAction.StopQuickViewItem,
                            });
                        } else if (Evergage.cashDom(e.target).closest("#quickViewModal").length > 0 && Evergage.cashDom(e.target).find("#quickViewModal .modal-dialog").length > 0) {
                            Evergage.sendEvent({
                                action: "Close Quick View",
                                itemAction: Evergage.ItemAction.StopQuickViewItem,
                            });
                        }
                    })
                ]
            },
            {
                name: "Cart",
                action: "Viewed Cart",
                isMatch: () => {
                    return /\/cart/.test(window.location.href);
                },
                itemAction: Evergage.ItemAction.ViewCart,
                order: {
                    Product: {
                        lineItems: {                    
                            sku: { _id: Evergage.resolvers.fromSelectorAttributeMultiple(".product-info .product-details .line-item-quanity-info", "data-pid")},
                            price: Evergage.resolvers.fromSelectorMultiple(".product-info .product-details .pricing"),
                            quantity: Evergage.resolvers.fromSelectorMultiple(".product-info .product-details .qty-card-quantity-count"),
                        }
                    }
                }
            },
            {
                name: "Checkout Process",
                action: "Checkout Process",
                isMatch: () => {
                    return /\/checkout/.test(window.location.href) && !/\/checkout-login/.test(window.location.href);
                },
                itemAction: Evergage.ItemAction.Review,
                order: {
                    Product: {
                        lineItems: {
                            sku: { _id: Evergage.resolvers.fromSelectorAttributeMultiple(".product-line-item .line-item-quanity-info", "data-pid")},
                            price: Evergage.resolvers.fromSelectorMultiple(".product-line-item .pricing"),
                            quantity: Evergage.resolvers.fromSelectorMultiple(".product-line-item .qty-card-quantity-count")   
                        }
                    }
                }
            },
            {
                name: "Order Confirmation",
                action: "Order Confirmation",
                isMatch: () => {
                    return /\/confirmation/.test(window.location.href);
                },
                itemAction: Evergage.ItemAction.Purchase,
                order: {
                    Product: {
                        lineItems: {
                            sku: { _id: Evergage.resolvers.fromSelectorAttributeMultiple(".product-line-item .line-item-quanity-info", "data-pid")},
                            price: Evergage.resolvers.fromSelectorMultiple(".product-line-item .pricing"),
                            quantity: Evergage.resolvers.fromSelectorMultiple(".product-line-item .qty-card-quantity-count")   
                        }
                    }
                }
            },
            {
                name: "Community Login",
                action: "Community Login",
                //isMatch: () => { return /\/s\/login/.test(window.location.href);},
                isMatch: () => window.location.hostname === "community.northerntrailoutfitters.com" && /\/s\/login/.test(window.location.href),
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
            },
            {
                name: "Community Stories",
                action: "Viewed Stories",
                isMatch: () => {
                    return  /\/s\/stories/.test(window.location.href);
                }
            },
            {
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
            },
            {
                name: "Login",
                action: "Login",
                isMatch: () => {
                    return (/\/login/.test(window.location.href) ||  /\/checkout-login/.test(window.location.href))&& !/\/s\/login/.test(window.location.href);
                },
                onActionEvent: (event) => {
                    if (event.action === "Login") {
                        window.setTimeout(() => {
                            Evergage.cashDom("form[name='login-form'] button").on("click", () => {
                                var email = Evergage.cashDom("#login-form-email").val();
                                if (email) {
                                    Evergage.sendEvent({action: "Logged In", user: {id: email, attributes: {emailAddress: email}} });
                                }
                            });  
                        }, 500);
                    }
                    return event;
                },
            },
            {
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
                    {name: "Search Bar", selector: "nav form[role='search']"},
                    {name: "Homepage | Redirect"}
                ]
            },

            {
                name: "Community Question",
                action: "Community Question",
                isMatch: () => {
                    return window.location.hostname === "community.northerntrailoutfitters.com" 
                    && /\/s\/question\//.test(window.location.pathname) 
                    && !/\/login/.test(window.location.href);
                },
                onActionEvent: (event) => {
                    return event;
                },
                contentZones: [
                    { name: "Community Rec", selector: "#NTO-page > div.body > div > div.slds-grid.slds-wrap.slds-medium-nowrap.slds-large-nowrap > div.slds-col--padded.slds-size--12-of-12.slds-medium-size--4-of-12.slds-large-size--4-of-12.comm-layout-column > div > div:nth-child(4) > div"},
                ],
                listeners: [
                    
                ]
            },
            {
                name: "Community Homepage",
                action: "Community Homepage",
                isMatch: () => {
                    return window.location.hostname === "community.northerntrailoutfitters.com" 
                        && /\/s/.test(window.location.pathname) 
                        && !/\/s\/question\//.test(window.location.pathname) 
                        && !/\/login/.test(window.location.href);
                },
                onActionEvent: (event) => {
                return event;
                },
                listeners: [
                    Evergage.listener("click", "div.topicContent", () => {
                        var topicLabel = Evergage.cashDom(event.currentTarget).find(".topicLabel").text().trim();
                        console.log("topic label is =" + topicLabel);
                        if (typeof topicLabel === "string") {
                            Evergage.sendEvent({ action: "Community Homepage - " + topicLabel + "" });
                        }
                    }),
                ]
            },
            {
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
                            action: "Purchase",
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
            },
            {
                name: "Discover - Stories",
                action: "Discover - Stories",
                isMatch: () => /\/default\/stories/.test(window.location.href)
            }
        ],
        pageTypeDefault: {
            name: "Default"
        }
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



    Evergage.initSitemap(config);
});
