if (!customElements.get("s-main-cart")) {
  customElements.define(
    "s-main-cart",
    class SectionMainCart extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.gtmAnalyticViewCartEvent();
        this.updateVariables();
        this.addEventListener('click', this._handleClickGTM)

        this.cartUpdatedUnsubscriber = window.PubSub.subscribe("main-cart-updated", this.updateCartContent);
        this.updateMainCartUnsubscriber = window.PubSub.subscribe("update-main-cart", this.updateCartContent);
        this.addItemUnsubscriber = window.PubSub.subscribe("cart-add-item", this.addedItemHandler);
      }

      disconnectedCallback() {
        this.deleteItemButtons?.forEach((button) => {
          button.removeEventListener("click", this.deleteItem);
        });
        this.qtyButtonsPlus?.forEach((button) => button.removeEventListener("click", this.qtyButtonPlusClickHandler));
        this.qtyButtonsMinus?.forEach((button) => button.removeEventListener("click", this.qtyButtonMinusClickHandler));
        this.qtyInputs?.forEach((input) => input.removeEventListener("change", this.qtyInputChangeHandler));
        this.openVariantPickerButton?.forEach((button) => button?.removeEventListener("click", this.openVariantPicker));
        this.offersModalOpener?.forEach((button) => button?.removeEventListener("click", this.openModalOffers));
        this.removeEventListener('click', this._handleClickGTM)

        this.cartUpdatedUnsubscriber();
        this.addItemUnsubscriber();
        this.updateMainCartUnsubscriber();
      }

      _handleClickGTM = (event) => {
        let targetProductCard = event.target.closest(".js-main-cart__item");

        if (!targetProductCard) return;

        let data = {
          item_list_name: `Main Cart`,
          item_list_id: `main_cart`,
          items: [
            {
              item_id: targetProductCard.dataset.id,
              item_name: targetProductCard.dataset.itemName,
              item_brand: targetProductCard.dataset.brand,
              item_category: targetProductCard.dataset.type,
              price: targetProductCard.dataset.price,
              quantity: 1,
            },
          ],
        };

        window.PubSub.publish('gtm_select_item', data)
      };

      gtmAnalyticItemQtyChangeEvent = (itemData, action) => {
        const data = {
          ecommerce: {
            currency: window.Shopify.currency.active,
            items: itemData,
          },
        };

        if (action === "remove") {
          window.PubSub.publish("gtm_remove_from_cart", data);
        } else if (action === "add") {
          window.PubSub.publish("gtm_add_to_cart", data);
        }
      };

      gtmAnalyticViewCartEvent = () => {
        const currentCartObject = JSON.parse(this.dataset.cartJson);

        const data = {
          ecommerce: {
            currency: window.Shopify.currency.active,
            items: currentCartObject.items,
          },
        };

        window.PubSub.publish("gtm_view_cart", data);
      };

      updateVariables = () => {
        this.sectionId = this.dataset.sectionId;
        this.closeButton = this.querySelector(".js-main-cart__button-close");
        this.sideCartWrapper = this;
        this.inner = this.querySelector(".js-main-cart__inner");

        this.deleteItemButtons = this.querySelectorAll(".js-main-cart__item-button-delete");
        this.loader = this.querySelector(".js-main-cart__loader");

        this.qtyInputs = this.querySelectorAll(".js-main-cart__form-qty-input");
        this.qtyButtonsPlus = this.querySelectorAll(".js-main-cart__form-qty-button--plus");
        this.qtyButtonsMinus = this.querySelectorAll(".js-main-cart__form-qty-button--minus");

        this.openVariantPickerButton = this.querySelectorAll(".js-main-cart__open-variant-picker");
        this.offersModalOpener = this.querySelectorAll(".js-main-cart__open-offers");

        this.container = this.querySelector(".js-main-cart__container");
        this.itemsContainer = this.querySelector(".js-main-cart__line-items-wrapper");

        this.summaryCta = this.querySelector(".js-main-cart__cta");
        this.totalPriceElement = this.querySelector(".js-summary-total");
        this.subtotalPriceElement = this.querySelector(".js-summary-subtotal");
        this.itemCount = this.querySelector(".js-cart-counter");

        this.deleteItemButtons?.forEach((button) => {
          button.addEventListener("click", this.deleteItem);
        });

        this.qtyButtonsPlus?.forEach((button) => button.addEventListener("click", this.qtyButtonPlusClickHandler));
        this.qtyButtonsMinus?.forEach((button) => button.addEventListener("click", this.qtyButtonMinusClickHandler));
        this.qtyInputs?.forEach((input) => input.addEventListener("change", this.qtyInputChangeHandler));
        this.openVariantPickerButton?.forEach((button) => button?.addEventListener("click", this.openVariantPicker));
        this.offersModalOpener?.forEach((button) => button?.addEventListener("click", this.openModalOffers));

        if (this.querySelector(".js-main-cart__tabby")) {
          this.initTabby();
        }
      };

      initTabby = () => {
        const tabbyWrapper = this.querySelector(".js-main-cart__tabby");

        let tabbyPublicKey;
        let tabbyMerchantCode;

        if (tabbyWrapper) {
          tabbyPublicKey = tabbyWrapper.dataset.publicKey;
          tabbyMerchantCode = tabbyWrapper.dataset.merchantCode;
        }

        if (tabbyWrapper && typeof TabbyPromo === "function") {  
          new TabbyPromo({
           selector: '#TabbyPromo',
           currency: tabbyWrapper.dataset.currency,
           price: tabbyWrapper.dataset.price,
           lang: tabbyWrapper.dataset.lang,
           source: tabbyWrapper.dataset.source,
           publicKey: tabbyPublicKey,
           merchantCode: tabbyMerchantCode
          });
        }
      };

      openModalOffers = (event) => {
        const data = {
          handle: event.target.dataset.productHandle,
          variant: event.target.dataset.variantId,
          tag: event.target.dataset.offerTag,
          tagTitle: event.target.dataset.offerTitle,
          cart: this.dataset.cartJson,
          hasOverlay: true,
        };
        window.PubSub.publish("open-modal-offers", data);
      };

      openVariantPicker = (event) => {
        const itemId = event.target.dataset.itemId || event.target.parentNode.dataset.itemId;

        const data = {
          handle: event.target.dataset.productHandle,
          variant: event.target.dataset.variantId,
          hasOverlay: true,
          edit: itemId,
        };
        window.PubSub.publish("open-modal-variant-picker", data);
      };

      addedItemHandler = () => {
        this.updateCartContent().then(() => {
          //this pubsub is use, when we quick add a product from the search modal
          window.PubSub.publish("close-modal-search");
        });
      };

      qtyInputChangeHandler = (event) => {
        event.preventDefault();

        const input = event.target;
        const buttonPlus = event.target.closest(".js-main-cart__item-quantity").querySelector(".js-main-cart__form-qty-button--plus");
        const buttonMinus = event.target.closest(".js-main-cart__item-quantity").querySelector(".js-main-cart__form-qty-button--minus");

        if (parseInt(input.value) > parseInt(input.max)) {
          input.value = input.max;
        }

        if (parseInt(input.value) < parseInt(input.min)) {
          input.value = input.min;
        }

        if (parseInt(input.value) === parseInt(input.max)) {
          buttonPlus.classList.add("s-main-cart__form-qty-button--disabled");
        } else {
          buttonPlus.classList.remove("s-main-cart__form-qty-button--disabled");
        }

        if (parseInt(input.value) === parseInt(input.min)) {
          buttonMinus.classList.add("s-main-cart__form-qty-button--disabled");
        } else {
          buttonMinus.classList.remove("s-main-cart__form-qty-button--disabled");
        }

        this.updateQuantity(input);
      };

      qtyButtonPlusClickHandler = (event) => {
        const input = event.target.closest(".js-main-cart__item-quantity").querySelector(".js-main-cart__form-qty-input");
        input.value = parseInt(input.value) + 1;

        input.dispatchEvent(new Event("change"));
      };

      qtyButtonMinusClickHandler = (event) => {
        const input = event.target.closest(".js-main-cart__item-quantity").querySelector(".js-main-cart__form-qty-input");
        input.value = parseInt(input.value) - 1;

        input.dispatchEvent(new Event("change"));
      };

      deleteItem = async (event) => {
        this.playLoader();
        event.preventDefault();

        const itemId = event.target.dataset.itemId || event.target.parentNode.dataset.itemId;

        let formData = {
          id: itemId,
          quantity: 0,
        };

        await fetch(window.Shopify.routes.root + "cart/change.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })
          .then((response) => response.json())
          .then((res) => {
            this.itemsContainer.classList.add("wait-response");
            this.dataset.cartJson = JSON.stringify(res);
            window.PubSub.publish("main-cart-updated", res);
            window.PubSub.publish("update-header-cart-counter", res);

            if (res.items_removed?.length) {
              this.gtmAnalyticItemQtyChangeEvent(res.items_removed, "remove");
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            this.stopLoader();
          });
      };

      updateQuantity = async (input) => {
        this.playLoader();

        const itemId = input.closest(".js-main-cart__item").dataset.variantId;

        let formData = {
          id: itemId,
          quantity: input.value,
        };

        await fetch(window.Shopify.routes.root + "cart/change.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })
          .then((response) => {
            return response.json();
          })
          .then((cart) => {
            this.dataset.cartJson = JSON.stringify(cart);
            window.PubSub.publish("main-cart-updated", cart);
            window.PubSub.publish("update-header-cart-counter", cart);

            if (cart.items_added?.length) {
              this.gtmAnalyticItemQtyChangeEvent(cart.items_added, "add");
            } else if (cart.items_removed?.length) {
              this.gtmAnalyticItemQtyChangeEvent(cart.items_removed, "remove");
            }
          })
          .catch((error) => {
            console.error("Error:", error);

            this.stopLoader();
          });
      };

      updateCartContent = async () => {
        const url = window.Shopify.routes.root + `?section_id=${this.sectionId}`;

        await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: `application/json`,
          },
        })
          .then((response) => response.text())
          .then((response) => {
            const selector = `#${this.sectionId}`;

            const parser = new DOMParser();
            const parsedData = parser.parseFromString(response, "text/html");

            this.container.innerHTML = parsedData.querySelector(".js-main-cart__container").innerHTML;

            this.itemsContainer.classList.remove("wait-response");

            this.updateVariables();
          })
          .finally(() => {
            this.updateCartCount();
            this.stopLoader();
          });
      };

      updateCartCount = async () => {
        fetch(window.Shopify.routes.root + `cart.js`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: `application/json`,
          },
        })
          .then((response) => response.json())
          .then(async (response) => {
            window.PubSub.publish("update-header-cart-counter", response);
          });
      };

      playLoader = () => {
        this.loader.classList.add("is-loading");
      };

      stopLoader = () => {
        this.loader.classList.remove("is-loading");
      };
    }
  );
}
