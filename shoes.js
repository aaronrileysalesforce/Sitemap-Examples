//There is a TEST site and a PROD site
//This block figures out which site I am on
//and sets the cookieDomain
const getDomain = () => {
    let currentDomain = window.location.hostname;
    let _cookieDomain;
    if (currentDomain === "www.shoes.com"){
      _cookieDomain = "shoes.com";
    }else if (currentDomain === "staging-na01-jackrabbit.demandware.net"){
      _cookieDomain = "staging-na01-jackrabbit.demandware.net";
    }
    //console.log("domain: " + _cookieDomain);
    return _cookieDomain;
}
//Only run the beacon if I am on one of these domains
var allowedDomains = [
    "www.shoes.com",
    "staging-na01-jackrabbit.demandware.net"
];
(allowedDomains.indexOf(window.location.hostname) >= 0) && Evergage.init({
    cookieDomain: getDomain()
}).then(() => {

    /**** CUSTOM FUNCTIONS TO HELP WITH SITEMAPPING - BEGIN *****/

    //Hard coding prod ID for Giftcard.  Didn't want to do this but there was no way around it.
    const _giftCardID = (gcID = "shoes.com E-Gift Certificate") => {
      return gcID;
    };

    //User Locale - Harcoding to en_US but if multi locale is ever needed just pass the proper locale into the function call
    const _locale = (_tempLocale = "en_US") => {
      return _tempLocale;
    };
    const _currency = (_tempCurrency= "USD") => {
      return _tempCurrency;
    };

    //Get values directly from 1st party cookies
    function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    }

    //Handles the SPA portion of the checkout experience
    let _timerIsAlreadyRunning = false;
    const handleSPAPageChange = () => {
        let _url = window.location.search;
        if(!_timerIsAlreadyRunning){
          _timerIsAlreadyRunning = true;
          const _urlChangeInterval = setInterval(() => {
            //console.log("_timerIsAlreadyRunning: " + _timerIsAlreadyRunning);
              if (_url !== window.location.search) {
                  _url = window.location.search;
                  //console.log(document.readyState);
                  Evergage.reinit();
                  //console.log("SPA - REINIT")
                  _timerIsAlreadyRunning = false;
                  clearInterval(_urlChangeInterval);
              }
          }, 1000);
        }
    };

    //Get data from the data layer - returned as object
    const getDataFromDataLayer = (type) => {
      let _type = type;
      let _tempDataArray = [];
      if (window.dataLayer) {
          for (let i = 0; i < window.dataLayer.length; i++) {
              if (window.dataLayer[i][_type]) {
                  _tempDataArray.push(window.dataLayer[i][_type]);
              }
          }
          return _tempDataArray.length !=0 ? _tempDataArray[_tempDataArray.length - 1] : {};
      }
    };

    //Group all of the ids, prices, or quantities from multiple product objects and return them as array
    const getCartItems = (prods,attr,isPurchase=false) => {
      let _cartItems = {};
      let _ids = [];
      let _prices = [];
      let _quantities = [];
      if(prods){
        for (let i = 0; i < prods.length; i++) {
          //IS it a giftcard? yes - send hardcoded ID : no - figure out if SKU or ID is needed
          if(!prods[i].sku && !prods[i].id){
            //console.log("giftcardid " + _giftCardID());
            _ids.push( _giftCardID() );
          }else{
            _ids.push( isPurchase ? prods[i].sku : prods[i].id);
          }
          //
          _prices.push(parseFloat(prods[i].price));
          _quantities.push(parseInt(prods[i].quantity));
        }
        _cartItems.ids = _ids;
        _cartItems.prices = _prices;
        _cartItems.quantities = _quantities;

        if(_ids){
          //console.log(_cartItems);
          return _cartItems[attr];
        }
      }else{
        return null;
      }
    };

    //grab the price baseed on SKU for prod object passed into function
    const getItemPriceFromCartSKU = (prods,SKU) => {
      //console.log("first" + prods.length);
      for (let i = 0; i < prods.length; i++) {
        return prods[i].id == SKU ? prods[i].price : 0
      }
    };

    //helper function to get querystring parameters
    const getQueryStringParam = (paramName) => {
      const queryString = window.location.search;
      //console.log(queryString);
      const urlParams = new URLSearchParams(queryString);
      return urlParams.get(paramName)
    };

    //Editing and item already in cart - Group all of the ids, prices, or quantities from multiple product objects and return them as array
    const getEditedCartItems = (attr) => {
      let _ids = [];
      let _prices = [];
      let _quantities = [];
      switch(attr) {
        case "ids":
          if(!Evergage.cashDom('div.cart__line-item').hasClass("gift-card__line-item")){
            Evergage.cashDom('div.cart__line-item').each((index)=>{
              let tempItem = Evergage.cashDom('div.cart__line-item')[index];
              //console.log( "item " + Evergage.cashDom(tempItem).attr('data-pid') );
              _ids.push( Evergage.cashDom(tempItem).attr('data-pid') );
            })
          }else{
            Evergage.cashDom('div.gift-card__line-item').each((index)=>{
              _ids.push( _giftCardID() );
            })
          }
          return _ids;
          break;
        case "prices":
          if(!Evergage.cashDom('div.cart__line-item').hasClass("gift-card__line-item")){
            Evergage.cashDom('div.product-line-item__unit-price div.pricing.line-item-total-price-amount').each((index)=>{
              let tempItem = Evergage.cashDom('div.product-line-item__unit-price div.pricing.line-item-total-price-amount')[index];
              //console.log( "item " + Evergage.cashDom(tempItem).text().replace("$","") );
              _prices.push( parseFloat(Evergage.cashDom(tempItem).text().replace("$","")) );
            })
          }else{
            Evergage.cashDom('div.gift-card__line-item').each((index)=>{
              let tempItem = Evergage.cashDom('div.cart__line-item')[index];
              _prices.push( getDataFromDataLayer("Products")[0].price );
            })
          }
          return _prices;
          break;
        case "quantities":
          if(!Evergage.cashDom('div.cart__line-item').hasClass("gift-card__line-item")){
            Evergage.cashDom('div.product-line-item__qty-form select.product-line-item__qty-input > option:checked').each((index)=>{
              let tempItem = Evergage.cashDom('div.product-line-item__qty-form select.product-line-item__qty-input > option:checked')[index];
              //console.log( "item " + Evergage.cashDom(tempItem).text() );
              _quantities.push( parseInt( Evergage.cashDom(tempItem).text() ) );
            })
          }else{
            Evergage.cashDom('div.gift-card__line-item').each((index)=>{
              let tempItem = Evergage.cashDom('div.cart__line-item')[index];
              _quantities.push( getDataFromDataLayer("Products")[0].quantity );
            })
          }
          return _quantities;
          break;
        default:
          // code block
      }
    };

    //limit a string to a fixed character limit
    const limitChars = (string = '', limit = 0) => {
      return string.substring(0, limit);
    }

    /******** CUSTOM EVENTS GENERATED BY MUTATIONOBSERVER - Begin *********/
    let MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    let targetNode = document.documentElement || document.body;
    let observerConfig = {
      childList: true,
      subtree: true,
      attributes: true,
      //attributeOldValue: true,
      attributeFilter: ["class","id","style"]
    };
    let intStudio_Observer = new MutationObserver((mutationRecords, mObserver) => {

        for (let i = 0; i < mutationRecords.length; i++) {
          let m = mutationRecords[i];
          //nodes which had an attribute change
          if (m.type === "attributes") {
            //Send event that the prod changes have been saved in commerce cloud and therefore it is safe to use the data avaialble such as SKU
            if( Evergage.cashDom(m.target).attr("data-product-component") == "add-button" && !Evergage.cashDom(m.target).hasClass("disabled") ){
              let promptEvent = new CustomEvent("intStudio:PromptProductReady");
              Evergage.cashDom("body")[0].dispatchEvent(promptEvent);
            }
          }
          //nodes added to the dom
          if (m.type === "childList" && m.addedNodes.length > 0) {
              m.addedNodes.forEach((node) => {
                  //console.log("added: " + node.className)
                  //send an event that a QuickView modal has opened - do not include the edit modal on the cart view page or the account wishlist page
                  if (node.attributes && node.attributes.id && (node.attributes.id.value === "modal-quickview") && !/\/s\/shoes\/cart\//.test(window.location.pathname) && !/\/s\/shoes\/wishlist\//.test(window.location.pathname) ){
                      let promptEvent = new CustomEvent("intStudio:PromptQuickView");
                      Evergage.cashDom("body")[0].dispatchEvent(promptEvent);
                  }
              })
          }
          //nodes removed from the dom
          if (m.type === "childList" && m.removedNodes.length > 0) {
              m.removedNodes.forEach((node) => {
                //if you are on the View Cart page - send an event when the Quick View modal has closed and you need to update cart contents
                  if (node.attributes && node.attributes.id && (node.attributes.id.value === "modal-quickview") && /\/s\/shoes\/cart\//.test(window.location.pathname) ){
                      //console.log("quickview modal removed");
                      let promptEvent = new CustomEvent("intStudio:PromptCartUpdate");
                      Evergage.cashDom("body")[0].dispatchEvent(promptEvent);
                  }

              })
          }
          //
        }
        //observer.disconnect(); //should never need to disconnect in our scenario but leaving this call incase it's needed in the future

    });
    /******** CUSTOM EVENTS GENERATED BY MUTATIONOBSERVER - End *********/

    /**** CUSTOM FUNCTIONS TO HELP WITH SITEMAPPING - END *****/

    /**** INTERACTION STUDIO GENERAL SITEMAP CONFIGURATION - BEGIN *****/
    const config = {
        global: {
           locale: _locale(),
           onActionEvent: (actionEvent) => {
             /* Look for SFMC SubscriberKey in URL */
             const subscriberKey = getQueryStringParam("sfmc_sk");
             if(subscriberKey) {
               actionEvent.user = actionEvent.user || {};
               actionEvent.user.attributes = actionEvent.user.attributes || {};
               actionEvent.user.attributes.sfmcContactKey = subscriberKey;
             }

             /* For logged in User - get User Info from Data Layer */
             //This is what we actually want to capture.  Uncomment this sectio when the user data cache issue is resolved
             /*if ( getDataFromDataLayer('customer')['isLoggedIn'].toLowerCase() === 'yes' ) {
                 actionEvent.user = actionEvent.user || {};
                 actionEvent.user.attributes = actionEvent.user.attributes || {};
                 const email = getDataFromDataLayer('customer')['email'];
                 if(email) actionEvent.user.id = email;
                 actionEvent.user.attributes.firstName = getDataFromDataLayer('customer')['first_name'] || null;
                 actionEvent.user.attributes.lastName = getDataFromDataLayer('customer')['last_name'] || null;
                 actionEvent.user.attributes.phone = getDataFromDataLayer('customer')['phone'] || null;
                 actionEvent.user.attributes.email = getDataFromDataLayer('customer')['email'] || null;
                 actionEvent.user.attributes.currentPoints = getDataFromDataLayer('customer')['current_points'] || null;
                 actionEvent.user.attributes.rewardAmountAvailable = getDataFromDataLayer('customer')['reward_amount_avail'] || null;
                 actionEvent.user.attributes.pointsUntilNextReward = getDataFromDataLayer('customer')['points_until_next_reward'] || null;
                 actionEvent.user.attributes.customerId = getDataFromDataLayer('customer')['customerID'] || null;                                                                                                                                                 actionEvent.user.attributes.firstName = getDataFromDataLayer('customer')['first_name'] || null;
             }*/


             //The below should only be uncommented while testing - shows up in developer console
             //console.log("evg: ", actionEvent);
             //
             return actionEvent;
             //
           },
           listeners: [
             //FOOTER EMAIL SIGNUP
             Evergage.listener("submit","div#footerSubscriptionBanner form",() => {
               //Evergage.sendException(new Error("footer signup form submit"));
               const email = Evergage.cashDom("#footerSubscriptionBanner form input[name='email']").val();
               let actionEvent = {
                   user: {},
                   action: "Email Sign Up - Footer",
                   source: {
                       locale: _locale()
                   }
               };
               if ( email ) {
                   actionEvent.user.id = email;
               }
               Evergage.sendEvent(actionEvent);
             }),
             Evergage.listener("click","html",(e) => {
             //MINI CART - Remove From Cart
               if( Evergage.cashDom(e.target).hasClass("cart-delete-confirmation-btn")
                    && Evergage.cashDom(e.target).closest("div.minicart__line-items").length){
                  let _price = Evergage.cashDom(e.target).closest("div[data-product-container=card]").find("span.price__sales > span").length ? parseFloat( Evergage.cashDom(e.target).closest("div[data-product-container=card]").find("span.price__sales > span").attr("content") ) : parseFloat( Evergage.cashDom("select[data-line-item-component=qty-action]").closest("div.product-line-item__qty-pricing").find('div.pricing').text().replace("$","") )
                 const lineItem = {
                     _id: Evergage.cashDom(e.target).attr("data-pid"),
                     price: _price,
                     quantity: 0
                 };
                 //console.log("line item: " + lineItem._id + " | " + lineItem.price + " | " + lineItem.quantity);
                 /*const evgEvent = {
                     action: "Remove from Cart",
                     itemAction: Evergage.ItemAction.RemoveFromCart,
                     cart: {
                         singleLine: {
                             Product: lineItem
                         },
                         source: {
                             locale: _locale()
                         }
                     }
                 };*/
                 const evgEvent = {
                     action: "Remove From Cart",
                     itemAction: Evergage.ItemAction.UpdateLineItem,
                     cart: {
                         singleLine: {
                             Product: lineItem
                         }
                     },
                     source: {
                         locale: _locale()
                     }
                 }
                 Evergage.sendEvent(evgEvent);
               }
               //MINI CART - Move to Wishlist ( which actually removes from cart )
               if( Evergage.cashDom(e.target).hasClass("product-line-item__wishlist-add")
                    && Evergage.cashDom(e.target).closest("div.minicart__line-items").length){
                 let _price = Evergage.cashDom(e.target).closest("div[data-product-container=card]").find("span.price__sales > span").length ? parseFloat( Evergage.cashDom(e.target).closest("div[data-product-container=card]").find("span.price__sales > span").attr("content") ) : parseFloat( Evergage.cashDom("select[data-line-item-component=qty-action]").closest("div.product-line-item__qty-pricing").find('div.pricing').text().replace("$","") );
                 const lineItem = {
                     _id: Evergage.cashDom(e.target).attr("data-pid"),
                     price: _price,
                     quantity: 0
                 };
                 //console.log("line item: " + lineItem._id + " | " + lineItem.price + " | " + lineItem.quantity);
                 const evgEvent = {
                     action: "Move to Wishlist",
                     itemAction: Evergage.ItemAction.Favorite,
                     catalog: {
                         Product: {
                             _id: lineItem._id,
                             currency: "USD"
                         }
                     },
                     source: {
                         locale: _locale()
                     }
                 }
                 Evergage.sendEvent(evgEvent);
                 /*const evgEvent2 = {
                     action: "Remove From Cart",
                     itemAction: Evergage.ItemAction.RemoveFromCart,
                     cart: {
                         singleLine: {
                             Product: lineItem
                         }
                     },
                     source: {
                         locale: _locale()
                     }
                 };*/
                 const evgEvent2 = {
                     action: "Remove From Cart",
                     itemAction: Evergage.ItemAction.UpdateLineItem,
                     cart: {
                         singleLine: {
                             Product: lineItem
                         }
                     },
                     source: {
                         locale: _locale()
                     }
                 }
                 Evergage.sendEvent(evgEvent2);
                 //
               }
               //QUICK VIEW COLOR CHANGE
               if ( Evergage.cashDom(e.target).hasClass("product-attribute__swatch") && Evergage.cashDom("div#modal-quickview div.quickview-master").length && !Evergage.cashDom(e.target).closest("section.quickview__main").find("button.add-to-cart").hasClass("disabled") ) {
                 if(!Evergage.cashDom(e.target).hasClass("selected")){
                   //console.log("TRYING COLOR! " + Evergage.cashDom(e.target).attr("data-attr-value"));
                   //remove event listener if one is already attached
                   Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                   function handleProductReady(e) {
                     //remove event listener if one is already attached
                     Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                     //
                     if(Evergage.cashDom("div#modal-quickview div.quickview-master button.product-attribute__swatch.selected").attr("data-attr-value")){
                       //
                       const evgEvent = {
                           action: "View Item Detail",
                           itemAction: Evergage.ItemAction.ViewItemDetail,
                           catalog: {
                               Product: {
                                   _id: getDataFromDataLayer('page').id,
                                   sku: getDataFromDataLayer('page').sku ? { _id: getDataFromDataLayer('page').sku } : null,
                                   currency: "USD",
                                   dimensions: {
                                     Color: [Evergage.cashDom("div#modal-quickview div.quickview-master button.product-attribute__swatch.selected").attr("data-attr-value")]
                                   }
                               }
                           },
                           source: {
                               locale: _locale()
                           }
                       }
                       Evergage.sendEvent(evgEvent);
                    }
                   }
                  Evergage.cashDom("body")[0].addEventListener("intStudio:PromptProductReady",handleProductReady);
                  }
                }
                //Quick View Add To Cart
               if( Evergage.cashDom(e.target).hasClass("add-to-cart") && Evergage.cashDom("div#modal-quickview div.quickview-master").length && Evergage.cashDom(e.target).text().trim().toLowerCase() != "update"  ){
                  if( !Evergage.cashDom(e.target).hasClass("disabled") ){
                    //console.log("SKU AS ID: " + getDataFromDataLayer('page').sku);
                    const lineItem = Evergage.util.buildLineItemFromPageState("select[data-product-component=qty]");
                    lineItem._id = getDataFromDataLayer('page').id
                    lineItem.price = parseFloat( getDataFromDataLayer('page').price.replace("$","") );
                    lineItem.sku = { _id: getDataFromDataLayer('page').sku };
                    const evgEvent = {
                        action: "Add to Cart",
                        itemAction: Evergage.ItemAction.AddToCart,
                        cart: {
                            singleLine: {
                                Product: lineItem
                            }
                        },
                        source: {
                            locale: _locale()
                        }
                    }
                    Evergage.sendEvent(evgEvent);
                  }
                }
                //Quick View Add to Wishlist
                //console.log("  " + Evergage.cashDom(e.target).attr("data-wishlist-trigger-ready"))
                if( Evergage.cashDom(e.target).attr("data-wishlist-trigger-ready") == "cta" && Evergage.cashDom(e.target).text() == "Add to Wishlist" && Evergage.cashDom("div#modal-quickview div.quickview-master").length ){
                    const evgEvent = {
                        action: "Move to Wishlist",
                        itemAction: Evergage.ItemAction.Favorite,
                        catalog: {
                            Product: {
                                _id: getDataFromDataLayer('page').id,
                                sku: getDataFromDataLayer('page').sku ? { _id: getDataFromDataLayer('page').sku } : null,
                                currency: "USD"
                            }
                        },
                        source: {
                            locale: _locale()
                        }
                    }
                    Evergage.sendEvent(evgEvent);
                }
               //Quick View Modal Close
               if ( Evergage.cashDom(e.target).hasClass("window-modal__close") && !/\/s\/shoes\/cart\//.test(window.location.pathname) ) {
                 //
                  Evergage.sendEvent({
                      action: "Close Quick View",
                      itemAction: Evergage.ItemAction.StopQuickViewItem,
                      source: {
                          locale: _locale()
                      }
                  });//
              } else if ( Evergage.cashDom(e.target).find(".window-modal__content").length > 0 && !/\/s\/shoes\/cart\//.test(window.location.pathname) ) {
                  Evergage.sendEvent({
                      action: "Close Quick View",
                      itemAction: Evergage.ItemAction.StopQuickViewItem,
                      source: {
                          locale: _locale()
                      }
                  });
              }
             }),
             Evergage.listener("change","html",(e) => {
               //console.log( "the thing that changed: " + Evergage.cashDom(e.target).attr("id") + " | " + Evergage.cashDom(e.target).attr("name") + " | " +  Evergage.cashDom(e.target).attr("class")   )
               //MINI CART - Update Line Item Quantity
               if( Evergage.cashDom(e.target).hasClass("product-line-item__qty-input")
                && Evergage.cashDom(e.target).closest("div.minicart__line-items").length ){
                  const lineItem = {
                      _id: Evergage.cashDom(e.target).attr("data-pid"),
                      price: parseFloat( Evergage.cashDom("select[data-line-item-component=qty-action]").closest("div.product-line-item__qty-pricing").find('div.pricing').text().replace("$","") ),
                      quantity: parseInt( Evergage.cashDom(e.target).val() )
                  };
                  //console.log("line item: " + lineItem._id + " | " + lineItem.price + " | " + lineItem.quantity);
                  const evgEvent = {
                      action: "Update Line Item Quantity",
                      itemAction: Evergage.ItemAction.UpdateLineItem,
                      cart: {
                          singleLine: {
                              Product: lineItem
                          }
                      },
                      source: {
                          locale: _locale()
                      }
                  }
                  Evergage.sendEvent(evgEvent);
               }
               //QUICK VIEW SIZE CHANGE
              if ( Evergage.cashDom(e.target).hasClass("select-size") && Evergage.cashDom("div#modal-quickview div.quickview-master").length && !Evergage.cashDom(e.target).closest("section.quickview__main").find("button.add-to-cart").hasClass("disabled") ) {
                //console.log("TRYING SIZE!");
                //console.log("SIZE FROM QUICK VIEW");
                //remove event listener if one is already attached
                Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                  function handleProductReady(e) {
                    Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                    if( Evergage.cashDom("div#modal-quickview div.quickview-master select[data-attr=size] option:checked").attr("data-attr-value") ) {
                    const evgEvent = {
                        action: "View Item Detail",
                        itemAction: Evergage.ItemAction.ViewItemDetail,
                        catalog: {
                            Product: {
                                _id: getDataFromDataLayer('page').id,
                                sku: getDataFromDataLayer('page').sku ? { _id: getDataFromDataLayer('page').sku } : null,
                                currency: "USD",
                                dimensions: {
                                    Size: [Evergage.cashDom("div#modal-quickview div.quickview-master select[data-attr=size] option:checked").attr("data-attr-value")]
                                }
                            }
                        },
                        source: {
                            locale: _locale()
                        }
                    }
                    Evergage.sendEvent(evgEvent);
                  }
                }
                Evergage.cashDom("body")[0].addEventListener("intStudio:PromptProductReady",handleProductReady);
               }
               //QUICK VIEW WIDTH CHANGE
               if ( Evergage.cashDom(e.target).hasClass("select-width") && Evergage.cashDom("div#modal-quickview div.quickview-master").length && !Evergage.cashDom(e.target).closest("section.quickview__main").find("button.add-to-cart").hasClass("disabled") ) {
                 //console.log("TRYING WIDTH! ");
                 //remove event listener if one is already attached
                 Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                 function handleProductReady(e) {
                   Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                   if( Evergage.cashDom("div#modal-quickview div.quickview-master select[data-attr=width] option:checked").attr("data-attr-value") ){
                     const evgEvent = {
                         action: "View Item Detail",
                         itemAction: Evergage.ItemAction.ViewItemDetail,
                         catalog: {
                             Product: {
                                 _id: getDataFromDataLayer('page').id,
                                 sku: getDataFromDataLayer('page').sku ? { _id: getDataFromDataLayer('page').sku } : null,
                                 currency: "USD",
                                 dimensions: {
                                   Width: [Evergage.cashDom("div#modal-quickview div.quickview-master select[data-attr=width] option:checked").attr("data-attr-value")]
                                 }
                             }
                         },
                         source: {
                             locale: _locale()
                         }
                     }
                     Evergage.sendEvent(evgEvent);
                   }
                  }
                  Evergage.cashDom("body")[0].addEventListener("intStudio:PromptProductReady",handleProductReady);
                }
             }),
             //MINI CART - View
             Evergage.listener("click","a[data-minicart-component=trigger]",(e) => {
               if( /^cart$/.test(getDataFromDataLayer('generic').pageType) != true ){
                 const evgEvent = {
                     action: "View Mini-cart"
                 };
                 //
                 Evergage.sendEvent(evgEvent);
               }
             }),
             //ITEM QUICK VIEW
            Evergage.listener("intStudio:PromptQuickView", "body", (e) => {
              //console.log( "captured Quick View event : " + Evergage.cashDom(e.target).attr("id") + ' | ' + Evergage.cashDom(e.target).attr("name") );
               const _pid = Evergage.cashDom("div#modal-quickview div.quickview-master").attr("data-pid") ? Evergage.cashDom("div#modal-quickview div.quickview-master").attr("data-pid") : getDataFromDataLayer('page').id;
               //console.log("quickview pid: " + _pid);
               if (_pid) {
                 Evergage.sendEvent({
                     action: "Item Quick View",
                     itemAction: Evergage.ItemAction.QuickViewItem,
                     catalog: {
                         Product: {
                             _id: _pid,
                             currency: "USD"
                         }
                     },
                     source: {
                         locale: _locale()
                     }
                 });
               }
           })
           ]
        },
        pageTypeDefault: {
            name: "default"
        },
        pageTypes: [
          {
            name: "home",
            action: "Homepage",
            isMatch: () => /^home$/.test(getDataFromDataLayer('generic').pageType)

          },
          {
            name: "login_create_account",
            action: "Login or Create Account",
            isMatch: () => /^login-createaccount$/.test(getDataFromDataLayer('generic').pageType),
            listeners: [
              //CREATE ACCOUNT FORM - View
              Evergage.listener("click", "a[href='#register']" , (e) => {
                  Evergage.sendEvent({
                      action: "Create Account Form",
                      source: {
                          locale: _locale()
                      }
                  });
              }),
              //CREATED ACCOUNT
              Evergage.listener("submit", "div[data-auth-component='register-tab-page'] form.registration", (e) => {
                  Evergage.sendEvent({
                      action: "Create Account",
                      source: {
                          locale: _locale()
                      }
                  });
              }),
              //LOGIN
              Evergage.listener("submit", "div[data-auth-component='login-tab-page'] form.login-form", (e) => {
                  Evergage.sendEvent({
                      action: "Login",
                      source: {
                          locale: _locale()
                      }
                  });
              })
            ]
          },
          {
            name: "cart",
            action: "View Cart",
            isMatch: () => /^cart$/.test(getDataFromDataLayer('generic').pageType),
            itemAction: Evergage.ItemAction.ViewCart,
            catalog: {
                Product: {
                    currency: _currency(),
                    lineItems: {
                      _id: () => {
                          //console.log( getDataFromDataLayer("products") ? getCartItems(getDataFromDataLayer("products"),"ids") : "NO PRODS"  );
                          let _itemIDs = getCartItems(getDataFromDataLayer("products"),"ids");
                          let _giftItemIDs = getCartItems(getDataFromDataLayer("Products"),"ids");
                          let _allItemIDs = [].concat(_itemIDs,_giftItemIDs);
                          return _allItemIDs ? _allItemIDs : null;
                      },
                      price: () => {
                          //console.log( getDataFromDataLayer("products") ? getCartItems(getDataFromDataLayer("products"),"prices") : "NO PRODS" );
                          let _itemPrices = getCartItems(getDataFromDataLayer("products"),"prices");
                          let _giftItemPrices = getCartItems(getDataFromDataLayer("Products"),"prices");
                          let _allItemPrices = [].concat(_itemPrices,_giftItemPrices);
                          return _allItemPrices ? _allItemPrices : null;
                      },
                      quantity: () => {
                          //console.log( getDataFromDataLayer("products") ? getCartItems(getDataFromDataLayer("products"),"quantities") : "NO PRODS" );
                          let _itemQuantities = getCartItems(getDataFromDataLayer("products"),"quantities");
                          let _giftItemQuantities = getCartItems(getDataFromDataLayer("Products"),"quantities");
                          let _allItemQuantities = [].concat(_itemQuantities,_giftItemQuantities);
                          return _allItemQuantities ? _allItemQuantities : null;
                      }
                    }
                  }
                },
            /*cart: {
              complete: {
                    Product: {
                            _id: () => {
                                //console.log( getDataFromDataLayer("products") ? getCartItems(getDataFromDataLayer("products"),"ids") : "NO PRODS"  );
                                let _itemIDs = getCartItems(getDataFromDataLayer("products"),"ids");
                                let _giftItemIDs = getCartItems(getDataFromDataLayer("Products"),"ids");
                                let _allItemIDs = [].concat(_itemIDs,_giftItemIDs);
                                return _allItemIDs ? _allItemIDs : null;
                            },
                            price: () => {
                                //console.log( getDataFromDataLayer("products") ? getCartItems(getDataFromDataLayer("products"),"prices") : "NO PRODS" );
                                let _itemPrices = getCartItems(getDataFromDataLayer("products"),"prices");
                                let _giftItemPrices = getCartItems(getDataFromDataLayer("Products"),"prices");
                                let _allItemPrices = [].concat(_itemPrices,_giftItemPrices);
                                return _allItemPrices ? _allItemPrices : null;
                            },
                            quantity: () => {
                                //console.log( getDataFromDataLayer("products") ? getCartItems(getDataFromDataLayer("products"),"quantities") : "NO PRODS" );
                                let _itemQuantities = getCartItems(getDataFromDataLayer("products"),"quantities");
                                let _giftItemQuantities = getCartItems(getDataFromDataLayer("Products"),"quantities");
                                let _allItemQuantities = [].concat(_itemQuantities,_giftItemQuantities);
                                return _allItemQuantities ? _allItemQuantities : null;
                            }
                      }
                    }
                },*/
                listeners: [
                  //Remove From Cart
                  Evergage.listener("click", "button.cart-delete-confirmation-btn", (e) => {
                    let lineItem = {};
                    let _tempPrice;
                    if( Evergage.cashDom(e.target).closest("div[data-product-container=card]").find("div.product-line-item__unit-price span.price__sales").length  ){
                      _tempPrice = parseFloat( Evergage.cashDom(e.target).closest("div[data-product-container=card]").find("div.product-line-item__unit-price span.price__sales > span").attr("content"));
                    }else{
                      _tempPrice = parseFloat( Evergage.cashDom(e.target).closest("div[data-product-container=card]").find("div.product-line-item__unit-price div.pricing").text().trim().replace("$","") );
                    }
                    //If giftcard
                    if( Evergage.cashDom(e.target).closest("div[data-product-container='card']").hasClass("gift-card__line-item") ){
                      lineItem = {
                          _id: _giftCardID(),
                          price: parseFloat(Evergage.cashDom("button.link--underline").closest("div[data-product-container='card']").find("div.giftcertamount span.value").text().replace(" ","").replace("Price:","").replace("$","").trim()),
                          //quantity: parseInt(Evergage.cashDom(e.target).closest("div[data-product-container='card']").find("div.line-item-quantity > span").text().replace(" ","").replace("Quantity:","").trim())
                          quantity: 0
                      };
                    }else{
                      //normal product
                      lineItem = {
                          _id: Evergage.cashDom(e.target).attr("data-pid"),
                          price: _tempPrice,
                          quantity: 0
                      };
                    }
                      //console.log("line item: " + lineItem._id + " | " + lineItem.price + " | " + lineItem.quantity);
                      /*const evgEvent = {
                          action: "Remove from Cart",
                          itemAction: Evergage.ItemAction.RemoveFromCart,
                          cart: {
                              singleLine: {
                                  Product: lineItem
                              }
                          }
                      }*/
                      const evgEvent = {
                          action: "Remove From Cart",
                          itemAction: Evergage.ItemAction.UpdateLineItem,
                          cart: {
                              singleLine: {
                                  Product: lineItem
                              }
                          },
                          source: {
                              locale: _locale()
                          }
                      }
                      Evergage.sendEvent(evgEvent);
                    }),
                    //Update Line Item Quantity
                    Evergage.listener("change", "select[data-line-item-component=qty-action]", (e) => {
                        const lineItem = {
                            _id: Evergage.cashDom(e.target).attr("data-pid"),
                            price: parseFloat(getItemPriceFromCartSKU(getDataFromDataLayer("products"),Evergage.cashDom(e.target).attr("data-pid"))) ,
                            quantity: parseInt(Evergage.cashDom(e.target).val())
                        };
                        //console.log("line item: " + lineItem._id + " | " + lineItem.price + " | " + lineItem.quantity);
                        const evgEvent = {
                            action: "Update Line Item Quantity",
                            itemAction: Evergage.ItemAction.UpdateLineItem,
                            cart: {
                                singleLine: {
                                    Product: lineItem
                                }
                            },
                            source: {
                                locale: _locale()
                            }
                        }
                        Evergage.sendEvent(evgEvent);
                      }),
                      //Move to Wishlist (which actually removes from cart)
                      Evergage.listener("click", "button.product-line-item__wishlist-add", (e) => {
                        const lineItem = {
                            _id: Evergage.cashDom(e.target).attr("data-pid"),
                            price: parseFloat(getItemPriceFromCartSKU(getDataFromDataLayer("products"),Evergage.cashDom(e.target).attr("data-pid"))),
                            quantity: 0
                        };
                        //console.log("line item: " + lineItem._id + " | " + lineItem.price + " | " + lineItem.quantity);
                        const evgEvent = {
                            action: "Move to Wishlist",
                            itemAction: Evergage.ItemAction.Favorite,
                            catalog: {
                                Product: {
                                    _id: lineItem._id,
                                    currency: "USD"
                                }
                            },
                            source: {
                                locale: _locale()
                            }
                        }
                        Evergage.sendEvent(evgEvent);
                        /*const evgEvent2 = {
                            action: "Remove From Cart",
                            itemAction: Evergage.ItemAction.RemoveFromCart,
                            cart: {
                                singleLine: {
                                    Product: lineItem
                                }
                            }
                        }*/
                        const evgEvent2 = {
                            action: "Remove From Cart",
                            itemAction: Evergage.ItemAction.UpdateLineItem,
                            cart: {
                                singleLine: {
                                    Product: lineItem
                                }
                            },
                            source: {
                                locale: _locale()
                            }
                        }
                        Evergage.sendEvent(evgEvent2);
                      }),
                      Evergage.listener("intStudio:PromptCartUpdate", "body", (e) => {
                        //console.log( getEditedCartItems("ids") );
                        let _ids = getEditedCartItems("ids");
                        //console.log( getEditedCartItems("prices") );
                        let _prices = getEditedCartItems("prices");
                        //console.log( getEditedCartItems("quantities") );
                        let _quantities = getEditedCartItems("quantities");
                        //
                        let _numLineItems = _ids.length;
                        //
                        let _lineItems = [];
                        for (let i = 0; i < _numLineItems; i++) {
                          let tempLineItem = new Object();
                          tempLineItem._id = _ids.shift();
                          tempLineItem.price = _prices.shift();
                          tempLineItem.quantity = _quantities.shift();
                          _lineItems.push(tempLineItem);
                        }
                        //console.log("LINE ITEMS: " + JSON.stringify(_lineItems));
                        //
                        const evgEvent = {
                        action: "Edit Cart",
                        itemAction: Evergage.ItemAction.ViewCart,
                        cart: {
                            complete: {
                                    Product: _lineItems
                                }
                            },
                            source: {
                                locale: _locale()
                            }
                        }
                        Evergage.sendEvent(evgEvent);
                      })

                ]
          },
          {
            name: "checkout_login",
            action: "Checkout Login",
            isMatch: () => /^checkout-login$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "checkout_shipping",
            action: "Checkout Shipping",
            isMatch: ()=> {
              return /^checkout-shipping$/.test(getDataFromDataLayer('generic').pageType) ? Evergage.DisplayUtils.pageElementLoaded("button.submit-shipping", "html").then(()=>true) : false
            },
            listeners:[
              Evergage.listener("click","div.order-summary__actions > button.submit-shipping",(e)=>{
                handleSPAPageChange();
              })
            ]
          },
          {
            name: "checkout_payment",
            action: "Checkout Payment",
            isMatch: () => /^payment/.test(Evergage.util.getParameterByName("stage")),
            listeners:[
              Evergage.listener("click","div.order-summary__actions > button.submit-payment",(e)=>{
                handleSPAPageChange();
              })
            ]
          },
          {
            name: "checkout_review",
            action: "Checkout Review",
            isMatch: () => /^placeOrder/.test(Evergage.util.getParameterByName("stage"))
          },
          {
            name: "order_confirmation",
            action: "Order Confirmation",
            isMatch: () => /^order-confirmation$/.test(getDataFromDataLayer('generic').pageType),
            itemAction: Evergage.ItemAction.Purchase,
            catalog: {
                Product: {
                  orderId: ()=>{
                    //console.log("orderId:" + getDataFromDataLayer("transactionId") );
                    return getDataFromDataLayer("transactionId");
                  },
                  currency: _currency(),
                  lineItems:{
                    _id: ()=>{
                      let _itemIDs = getCartItems(getDataFromDataLayer("transactionProducts"),"ids",true);
                      let _giftItemIDs = getCartItems(getDataFromDataLayer("transactionGiftProducts"),"ids",true);
                      let _allItemIDs = _itemIDs.concat(_giftItemIDs);
                      return _allItemIDs.length ? _allItemIDs : null;
                    },
                    price: ()=>{
                      let _itemPrices = getCartItems(getDataFromDataLayer("transactionProducts"),"prices",true);
                      let _giftItemPrices = getCartItems(getDataFromDataLayer("transactionGiftProducts"),"prices",true);
                      let _allItemPrices = _itemPrices.concat(_giftItemPrices);
                      return _allItemPrices.length ? _allItemPrices : null;
                    },
                    quantity: ()=>{
                      let _itemQuantities = getCartItems(getDataFromDataLayer("transactionProducts"),"quantities",true);
                      let _giftItemQuantities = getCartItems(getDataFromDataLayer("transactionGiftProducts"),"quantities",true);
                      let _allItemQuantities = _itemQuantities.concat(_giftItemQuantities);
                      return _allItemQuantities.length ? _allItemQuantities : null;
                    }
                  }
                }
            }
          },
          {
            name: "search_results",
            action: "Search Results",
            isMatch: () => /^search-results$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "category",
            action: "Category",
            isMatch: () => /^category$/.test(getDataFromDataLayer('generic').pageType),
            catalog: {
                Category: {
                    _id: () => { return getDataFromDataLayer("generic").category }
                }
            }
          },
          {
            name: "womens",
            action: "Womens",
            isMatch: () => /^women$/.test(getDataFromDataLayer('generic').pageType),
            catalog: {
                Category: {
                    _id: () => { return getDataFromDataLayer("generic").category }
                }
            }
          },
          {
            name: "mens",
            action: "Mens",
            isMatch: () => /^men$/.test(getDataFromDataLayer('generic').pageType),
            catalog: {
                Category: {
                    _id: () => { return getDataFromDataLayer("generic").category }
                }
            }
          },
          {
            name: "kids",
            action: "Kids",
            isMatch: () => /^kids$/.test(getDataFromDataLayer('generic').pageType),
            catalog: {
                Category: {
                    _id: () => { return getDataFromDataLayer("generic").category }
                }
            }
          },
          {
            name: "brand",
            action: "Brand",
            isMatch: () => /^brand$/.test(getDataFromDataLayer('generic').pageType),
            catalog: {
                Category: {
                    _id: () => { return getDataFromDataLayer("generic").category }
                }
            }
          },
          {
            name: "sale",
            action: "Sale",
            isMatch: () => /^sale$/.test(getDataFromDataLayer('generic').pageType),
            catalog: {
                Category: {
                    _id: () => { return getDataFromDataLayer("generic").category; }
                }
            }
          },
          {
            name: "account",
            action: "Account",
            isMatch: () => /^account$/.test(getDataFromDataLayer('generic').pageType) && Evergage.DisplayUtils.pageElementLoaded("div.account-card__row", "html").then(() => true),
            onActionEvent: (actionEvent) => {
              //Leave this while the user data cache issue persists
              //Remove this entire onActionEvent when the user data cache issue is resolved
              if ( getDataFromDataLayer('customer')['isLoggedIn'].toLowerCase() === 'yes' ) {
                actionEvent.user = actionEvent.user || {};
                actionEvent.user.attributes = actionEvent.user.attributes || {};
                const email = Evergage.cashDom("div.account-card div.account-card__row").eq(2).find("div").text();
                if(email) actionEvent.user.id = email;
              }
              return actionEvent;
            }
          },
          {
            name: "account_profile",
            action: "Account Profile",
            isMatch: () => /^account-profile$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "rewards",
            action: "Rewards",
            isMatch: () => /^rewards$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "shoes_rewards",
            action: "Shoes Rewards",
            isMatch: () => /^shoes-rewards$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "account_wishlist",
            action: "Wishlist",
            isMatch: () => /\/s\/shoes\/wishlist\//.test(window.location.pathname),
            listeners:[
              Evergage.listener("click","button[data-product-component=add-button]",(e)=>{
                if( !Evergage.cashDom(e.target).hasClass("disabled") ){
                  //console.log("SKU AS ID: " + getDataFromDataLayer('page').sku);
                  const lineItem = {
                      _id: Evergage.cashDom(e.target).attr("data-pid"),
                      price: parseFloat( Evergage.cashDom(e.target).closest("div.product-line-item__main").find("span.price__sales > span.value").attr("content") ),
                      quantity: parseInt( Evergage.cashDom(e.target).closest("div.product-line-item__main").find("select.product-line-item__qty-input").attr("data-pre-select-qty") )
                  };
                  //lineItem.sku = { _id: getDataFromDataLayer('page').sku };
                  const evgEvent = {
                      action: "Add to Cart",
                      itemAction: Evergage.ItemAction.AddToCart,
                      cart: {
                          singleLine: {
                              Product: lineItem
                          }
                      },
                      source: {
                          locale: _locale()
                      }
                  }
                  Evergage.sendEvent(evgEvent);
                }
              })
            ]
          },
          {
            name: "gift_card",
            action: "Gift Card",
            isMatch: ()=> /^gift-cards$/.test(getDataFromDataLayer('generic').pageType),
            catalog: {
                Product: {
                    _id: _giftCardID(),
                    sku: null,
                    name: ()=>{return Evergage.cashDom("h1[data-product-component='name']").text().trim() },
                    description: null,
                    url: window.location.pathname,
                    imageUrl: ()=>{ return window.location.origin + Evergage.cashDom("div.gift-card-image > img.product-image").attr("src") },
                    inventoryCount: 1,
                    price: ()=>{ return parseFloat( Evergage.cashDom("select#giftcert_purchase_amount option:checked").attr("data-attr-value") == undefined ? 0 : Evergage.cashDom("select#giftcert_purchase_amount option:checked").attr("data-attr-value") ) },
                    currency: "USD",
                    categories: () => { return [getDataFromDataLayer('productCategory').replace(" ","-")] },
                  }
                },
            listeners:[
              Evergage.listener("submit","form.giftcert",(e)=>{
                //console.log("send me a gift card!");
                const lineItem = {
                    _id: _giftCardID(),
                    price: parseFloat( Evergage.cashDom("select#giftcert_purchase_amount option:checked").attr("data-attr-value") ),
                    quantity: 1
                };
                const evgEvent = {
                    action: "Add to Cart",
                    itemAction: Evergage.ItemAction.AddToCart,
                    cart: {
                        singleLine: {
                            Product: lineItem
                        }
                    },
                    source: {
                        locale: _locale()
                    }
                }
                Evergage.sendEvent(evgEvent);
              })
            ]
          },
          {
            name: "contact_us",
            action: "Contact Us",
            isMatch: () => /^contact-us$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "return_policy",
            action: "Return Policy",
            isMatch: () => /^return-policy$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "faq",
            action: "FAQ",
            isMatch: () => /^FAQs$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "privacy_policy",
            action: "Privacy Policy",
            isMatch: () => /^privacy-policy$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "exclusions",
            action: "Exclusions",
            isMatch: () => /^exclusions$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "payment_options",
            action: "Payment Options",
            isMatch: () => /^payment$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "about_us",
            action: "About Us",
            isMatch: () => /^about-us$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "terms_and_conditions",
            action: "Terms & Conditions",
            isMatch: () => /^terms-and-conditions$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "inclusion_and_diversity",
            action: "Inclusion & Diversity",
            isMatch: () => /^inclusion-diversity$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "careers",
            action: "Careers",
            isMatch: () => /^careers$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "reviews",
            action: "Reviews",
            isMatch: () => /^reviews$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "coupons",
            action: "Coupons",
            isMatch: () => /^coupons$/.test(getDataFromDataLayer('generic').pageType)
          },
          {
            name: "product_detail",
            action: "Product Detail",
            isMatch: () => { return /^pdp$/.test(getDataFromDataLayer('generic').pageType) ? Evergage.DisplayUtils.pageElementLoaded(".pdp", "html").then( ()=>true) : false },
            catalog: {
                Product: {
                    _id: () => { return getDataFromDataLayer('page').id },
                    sku: () => { return getDataFromDataLayer('page').sku ? { _id: getDataFromDataLayer('page').sku } : null },
                    name: () => { return getDataFromDataLayer('page').name },
                    description: () => {
                      return limitChars(Evergage.cashDom("div.pdp__details-description div.cms-generic-copy").find("p").first().text().trim(),250);
                    },
                    details:() =>{
                      let _tempDetails;
                      let _tempDetailText = "";
                      Evergage.cashDom('div.pdp__details-specs ul li').each((index)=>{
                        let _tempDetail = Evergage.cashDom(' div.pdp__details-specs ul li')[index];
                        if(index == 0){
                          _tempDetailText = _tempDetail.textContent;
                        }else{
                          _tempDetailText = _tempDetailText + " | " + _tempDetail.textContent;
                        }
                      })
                      _tempDetails = _tempDetailText;
                      return _tempDetails != undefined ? limitChars(_tempDetails,1023) : null;
                    },
                    url: window.location.pathname,
                    imageUrl: () => { return getDataFromDataLayer('page').image_address },
                    inventoryCount: 1,
                    price: () => { return getDataFromDataLayer('page').price },
                    priceDescription: () => { return getDataFromDataLayer('page').priceRange ? getDataFromDataLayer('page').priceRange : null},
                    currency: "USD",
                    rating: () => { return getDataFromDataLayer('page').ratings },
                    reviewCount: null,
                    categories: () => { return getDataFromDataLayer('page').category ? [getDataFromDataLayer('page').category] : null },
                    dimensions: {
                      Color: () => { return getDataFromDataLayer('page').color ? [getDataFromDataLayer('page').color] : null },
                      Brand: () => { return getDataFromDataLayer('page').brand ? [getDataFromDataLayer('page').brand] : null },
                      //Gender: () => { getDataFromDataLayer('page').gender ? getDataFromDataLayer('page').gender : null },
                      Size: () => { return getDataFromDataLayer('page').size ? [getDataFromDataLayer('page').size] : null },
                      Width: () => { return getDataFromDataLayer('page').width ? [getDataFromDataLayer('page').width] : null },
                      ShoePronation: () => { return getDataFromDataLayer('page').shoePronation ? [getDataFromDataLayer('page').shoePronation] : null },
                      Cushion: () => { return getDataFromDataLayer('page').cushion ? [getDataFromDataLayer('page').cushion] : null },
                      Weight: null,
                      Tags: () => {
                        if(getDataFromDataLayer('page').tags){
                          let initialTagsArray = getDataFromDataLayer('page').tags.split('|')?.filter(Boolean);
                          let finalTagsArray = initialTagsArray.filter((c, index) => {
                              return initialTagsArray.indexOf(c) === index;
                          });
                          return finalTagsArray;
                        }else{
                          return null;
                        }
                      }
                    }
                }
              },
              contentZones: [
                  { name: "PDP_product_recommendations", selector: "div.pdp__recommendations" }

              ],
              listeners:[
                //View Item Detail (when someone changes sizes)
                Evergage.listener("change", "select[data-attr=size]", (e) => {
                  Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                    function handleProductReady(e) {
                      //console.log("SIZE FROM PDP: " + e);
                      Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                      if( Evergage.cashDom("select[data-attr=size] option:checked").attr("data-attr-value") ){
                        let _tempSize = Evergage.cashDom("select[data-attr=size] option:checked").attr("data-attr-value");
                        const evgEvent = {
                            action: "View Item Detail",
                            itemAction: Evergage.ItemAction.ViewItemDetail,
                            catalog: {
                                Product: {
                                    _id: getDataFromDataLayer('page').id,
                                    sku: getDataFromDataLayer('page').sku ? { _id: getDataFromDataLayer('page').sku } : null,
                                    currency: "USD",
                                    dimensions: {
                                      Size: [_tempSize]
                                    }
                                }
                            },
                            source: {
                                locale: _locale()
                            }
                        }
                        Evergage.sendEvent(evgEvent);
                    }
                  }
                  //
                  //only listen for the PromptProductReady event if the add to cart button is active (means SKU is ready)
                  let _tempReadyAttr = Evergage.cashDom(e.target).closest("div.pdp-main__details").find("button.add-to-cart").attr("data-disabled");
                  if( _tempReadyAttr === undefined ) {
                    Evergage.cashDom("body")[0].addEventListener("intStudio:PromptProductReady",handleProductReady);
                  }
                }),
                //View Item Detail (when someone changes colors)
                Evergage.listener("click", "div.product-attribute--color button", (e) => {
                  if(!Evergage.cashDom(e.target).hasClass("selected")){
                    Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                    function handleProductReady(e) {
                      //console.log("COLOR FROM PDP");
                      Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                      if( Evergage.cashDom("div.pdp-main__details button.product-attribute__swatch.selected").attr("data-attr-value") ){
                        const evgEvent = {
                            action: "View Item Detail",
                            itemAction: Evergage.ItemAction.ViewItemDetail,
                            catalog: {
                                Product: {
                                    _id: getDataFromDataLayer('page').id,
                                    sku: getDataFromDataLayer('page').sku ? { _id: getDataFromDataLayer('page').sku } : null,
                                    currency: "USD",
                                    dimensions: {
                                        Color: [Evergage.cashDom("div.pdp-main__details button.product-attribute__swatch.selected").attr("data-attr-value")]
                                    }
                                }
                            },
                            source: {
                                locale: _locale()
                            }
                        }
                        Evergage.sendEvent(evgEvent);
                      }
                    }
                    //only listen for the PromptProductReady event if the add to cart button is active (means SKU is ready)
                    let _tempReadyAttr = Evergage.cashDom(e.target).closest("div.pdp-main__details").find("button.add-to-cart").attr("data-disabled");
                    if( _tempReadyAttr === undefined ) {
                      Evergage.cashDom("body")[0].addEventListener("intStudio:PromptProductReady",handleProductReady);
                    }
                  }
                }),
                //View Item Detail (when someone changes width)
                Evergage.listener("change", "select[data-attr=width]", (e) => {
                  //
                  if ( Evergage.cashDom(e.target).hasClass("select-width") && !Evergage.cashDom("div#modal-quickview div.quickview-master").length ) {
                    //console.log("TRYING WIDTH! ");
                    //remove event listener if one is already attached
                    Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                      function handleProductReady(e) {
                        Evergage.cashDom("body")[0].removeEventListener("intStudio:PromptProductReady",handleProductReady);
                        if( Evergage.cashDom("div.pdp-main__details select[data-attr=width] option:checked").attr("data-attr-value") ){
                        const evgEvent = {
                            action: "View Item Detail",
                            itemAction: Evergage.ItemAction.ViewItemDetail,
                            catalog: {
                                Product: {
                                    _id: getDataFromDataLayer('page').id,
                                    sku: getDataFromDataLayer('page').sku ? { _id: getDataFromDataLayer('page').sku } : null,
                                    currency: "USD",
                                    dimensions: {
                                      Width: [Evergage.cashDom("div.pdp-main__details select[data-attr=width] option:checked").attr("data-attr-value")]
                                    }
                                }
                            },
                            source: {
                                locale: _locale()
                            }
                        }
                        Evergage.sendEvent(evgEvent);
                      }
                    }
                    //only listen for the PromptProductReady event if the add to cart button is active (means SKU is ready)
                    let _tempReadyAttr = Evergage.cashDom(e.target).closest("div.pdp-main__details").find("button.add-to-cart").attr("data-disabled");
                    if( _tempReadyAttr === undefined ) {
                      Evergage.cashDom("body")[0].addEventListener("intStudio:PromptProductReady",handleProductReady);
                    }
                   }
                }),
                //Add to Cart
                Evergage.listener("click", "button.add-to-cart", (e) => {
                    if( !Evergage.cashDom(e.target).hasClass("disabled") ){
                      //console.log("SKU AS ID: " + getDataFromDataLayer('page').sku);
                      const lineItem = Evergage.util.buildLineItemFromPageState("select[data-product-component=qty]");
                      //
                      lineItem.price = parseFloat( getDataFromDataLayer('page').price.replace("$","") );
                      //lineItem.currency = "USD";
                      //
                      lineItem._id = getDataFromDataLayer('page').id
                      //
                      lineItem.sku = { _id: getDataFromDataLayer('page').sku ? getDataFromDataLayer('page').sku : null };
                      //
                      const evgEvent = {
                          action: "Add to Cart",
                          itemAction: Evergage.ItemAction.AddToCart,
                          cart: {
                              singleLine: {
                                  Product: lineItem
                              }
                          },
                          source: {
                              locale: _locale()
                          }
                      }
                      Evergage.sendEvent(evgEvent);
                    }
                  }),
                  //Move to Wishlist **
                  Evergage.listener("click", "div.product-common__wishlist > button", (e) => {
                    if(Evergage.cashDom(e.target).text().trim().toLowerCase() === "add to wishlist"){
                      const evgEvent = {
                          action: "Move to Wishlist",
                          itemAction: Evergage.ItemAction.Favorite,
                          catalog: {
                              Product: {
                                  _id: getDataFromDataLayer('page').id,
                                  sku: getDataFromDataLayer('page').sku ? { _id: getDataFromDataLayer('page').sku } : null,
                                  currency: "USD"
                              }
                          },
                          source: {
                              locale: _locale()
                          }
                      }
                      Evergage.sendEvent(evgEvent);
                    }
                  })
                ]
            }
        ]
    };
    /**** INTERACTION STUDIO GENERAL SITEMAP CONFIGURATION - END *****/


    //if given consent to be tracked initialize the IS Sitemap, else - do nothing
    if( getCookie('cookie_consent') == 'true'){
      //console.log("IS test 5");
      intStudio_Observer.observe(targetNode, observerConfig);
      Evergage.initSitemap(config);
      //console.log('INTERACTION STUDIO SITEMAP IS LIVE');
    }else{
      //uncomment below line when testing to know if consent was NOT given
      //console.log("IS HAS NO CONSENT");
    }
});
