if (!customElements.get("s-side-cart")) {
  customElements.define(
    "s-side-cart",
    class SideCart extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.updateVariables();
        this.addEventListener('click', this._handleClickGTM)

        this.cartUpdatedUnsubscriber = window.PubSub.subscribe("cart-updated", this.updateCartContent);
        this.addItemUnsubscriber = window.PubSub.subscribe("cart-add-item", this.addedItemHandler);
        this.openSideCartUnsubscriber = window.PubSub.subscribe("open-side-cart", this.openSideCart);
        this.mainCartUpdateUnsubscriber = window.PubSub.subscribe("main-cart-updated", () => {
          this.updateCartContent(false)
        });

        document.addEventListener("shopify:section:select", this.handleCustomizerSectionSelected);
        document.addEventListener("shopify:section:deselect", this.handleCustomizerSectionSelected);
      }

      disconnectedCallback() {
        this.closeButton?.removeEventListener("click", this.closeSideCart);
        this.overlay?.removeEventListener("click", this.closeSideCart);

        this.deleteItemButtons?.forEach((button) => {
          button.removeEventListener("click", this.deleteItem);
        });
        this.qtyButtonsPlus?.forEach((button) => button.removeEventListener("click", this.qtyButtonPlusClickHandler));
        this.qtyButtonsMinus?.forEach((button) => button.removeEventListener("click", this.qtyButtonMinusClickHandler));
        this.qtyInputs?.forEach((input) => input.removeEventListener("change", this.qtyInputChangeHandler));
        this.openVariantPickerButton?.forEach((button) => button.removeEventListener("click", this.openVariantPicker));
        this.offersModalOpener?.forEach((button) => button?.removeEventListener("click", this.openModalOffers));

        this.cartUpdatedUnsubscriber();
        this.openSideCartUnsubscriber();
        this.addItemUnsubscriber();
        this.mainCartUpdateUnsubscriber();

        this.removeEventListener('click', this._handleClickGTM)
        document.removeEventListener("shopify:section:select", this.handleCustomizerSectionSelected);
        document.removeEventListener("shopify:section:deselect", this.handleCustomizerSectionSelected);
      }

      _handleClickGTM = (event) => {
        let targetProductCard = event.target.closest(".js-side-cart__item");

        if (!targetProductCard) return;

        let data = {
          item_list_name: `Side Cart`,
          item_list_id: `side_cart`,
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

      updateVariables = () => {
        this.sectionId = this.dataset.sectionId;
        this.closeButton = this.querySelector(".js-side-cart__button-close");
        this.sideCartWrapper = this;
        this.deliveryIcon = this.querySelector(".js-side-cart__delivery-icon");
        this.inner = this.querySelector('.js-side-cart__inner')

        this.deleteItemButtons = this.querySelectorAll(".js-side-cart__item-button-delete");
        this.loader = this.querySelector(".js-side-cart__loader");

        this.qtyInputs = this.querySelectorAll(".js-side-cart__form-qty-input");
        this.qtyButtonsPlus = this.querySelectorAll(".js-side-cart__form-qty-button--plus");
        this.qtyButtonsMinus = this.querySelectorAll(".js-side-cart__form-qty-button--minus");

        this.openVariantPickerButton = this.querySelectorAll(".js-side-cart__open-variant-picker");
        this.offersModalOpener = this.querySelectorAll('.js-side-cart__open-offers')

        this.overlay = this.querySelector(".js-side-cart__overlay");
        this.itemsContainer = this.querySelector(".s-side-cart__body");
        this.subtext = this.querySelector(".js-side-cart__header-subtext");

        this.totalPriceElement = this.querySelector(".js-side-cart__total-price");
        this.itemCount = this.querySelector(".js-side-cart__header-item-count");

        this.closeButton?.addEventListener("click", this.closeSideCart);
        this.overlay?.addEventListener("click", this.closeSideCart);

        this.deleteItemButtons?.forEach((button) => {
          button.addEventListener("click", this.deleteItem);
        });

        this.qtyButtonsPlus?.forEach((button) => button.addEventListener("click", this.qtyButtonPlusClickHandler));
        this.qtyButtonsMinus?.forEach((button) => button.addEventListener("click", this.qtyButtonMinusClickHandler));
        this.qtyInputs?.forEach((input) => input.addEventListener("change", this.qtyInputChangeHandler));
        this.openVariantPickerButton?.forEach((button) => button.addEventListener("click", this.openVariantPicker));
        this.offersModalOpener?.forEach((button) => button?.addEventListener("click", this.openModalOffers));
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
          edit: itemId
        };
        window.PubSub.publish("open-modal-variant-picker", data);
      };

      addedItemHandler = () => {
        this.updateCartContent().then(() => {
          //this pubsub is use, when we quick add a product from the search modal
          window.PubSub.publish("close-modal-search");
          this.openSideCart();
        });
      };

      qtyInputChangeHandler = (event) => {
        event.preventDefault();

        const input = event.target;
        const buttonPlus = event.target.closest(".js-side-cart__item-quantity").querySelector(".js-side-cart__form-qty-button--plus");
        const buttonMinus = event.target.closest(".js-side-cart__item-quantity").querySelector(".js-side-cart__form-qty-button--minus");

        if (parseInt(input.value) > parseInt(input.max)) {
          input.value = input.max;
        }

        if (parseInt(input.value) < parseInt(input.min)) {
          input.value = input.min;
        }

        if (parseInt(input.value) === parseInt(input.max)) {
          buttonPlus.classList.add("s-side-cart__form-qty-button--disabled");
        } else {
          buttonPlus.classList.remove("s-side-cart__form-qty-button--disabled");
        }

        if (parseInt(input.value) === parseInt(input.min)) {
          buttonMinus.classList.add("s-side-cart__form-qty-button--disabled");
        } else {
          buttonMinus.classList.remove("s-side-cart__form-qty-button--disabled");
        }

        this.updateQuantity(input);
      };

      qtyButtonPlusClickHandler = (event) => {
        const input = event.target.closest(".js-side-cart__item-quantity").querySelector(".js-side-cart__form-qty-input");
        input.value = parseInt(input.value) + 1;

        input.dispatchEvent(new Event("change"));
      };

      qtyButtonMinusClickHandler = (event) => {
        const input = event.target.closest(".js-side-cart__item-quantity").querySelector(".js-side-cart__form-qty-input");
        input.value = parseInt(input.value) - 1;

        input.dispatchEvent(new Event("change"));
      };

      handleCustomizerSectionSelected = (event) => {
        const selectedSectionId = event.detail.sectionId;
        const modalId = this.dataset.id;
        if (selectedSectionId === modalId) {
          this.openSideCart();
        }
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
          .then((cart) => {
            this.itemsContainer.classList.add("wait-response");
            this.dataset.cartJson = JSON.stringify(cart)
            window.PubSub.publish("cart-updated", cart);
            window.PubSub.publish("update-header-cart-counter", cart);

            if (cart.items_removed?.length) {
              this.gtmAnalyticItemQtyChangeEvent(cart.items_removed, "remove");
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            this.stopLoader();
          });
      };

      updateQuantity = async (input) => {
        this.playLoader();

        const itemId = input.closest(".js-side-cart__item").dataset.variantId;

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
          .then((response) => {
            this.dataset.cartJson = JSON.stringify(response)
            window.PubSub.publish("cart-updated", response);
            window.PubSub.publish("update-header-cart-counter", response);

            if (response.items_added?.length) {
              this.gtmAnalyticItemQtyChangeEvent(response.items_added, "add");
            } else if (response.items_removed?.length) {
              this.gtmAnalyticItemQtyChangeEvent(response.items_removed, "remove");
            }
          })
          .catch((error) => {
            console.error("Error:", error);

            this.stopLoader();
          });
      };

      closeSideCart = () => {
        this.sideCartWrapper.classList.remove("s-side-cart--open");

        document.querySelector("body").classList.remove("side-cart-active");

        this.overlay.classList.remove("is-open");
        this.querySelectorAll(".s-side-cart__select").forEach((select) => {
          select.removeAttribute("open");
        });

        window.PubSub.publish('close-modal-variant-picker')
        window.PubSub.publish('close-modal-offers')
      };

      openSideCart = () => {
        this.sideCartWrapper.classList.add("s-side-cart--open");

        document.querySelector("body").classList.add("side-cart-active");

        setTimeout(() => {
          this.overlay.classList.add("is-open");
        }, 150); //cursor (x) appears too early without this
      };

      updateCartContent = async (openSideCart = true) => {
        const url = window.Shopify.routes.root + `?section=${this.sectionId}`;

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

            document.querySelector(selector).querySelector("style[data-shopify]").innerHTML = parsedData.querySelector(selector).querySelector("style[data-shopify]").innerHTML;

            this.inner.innerHTML = parsedData.querySelector(".js-side-cart__inner")?.innerHTML;

            this.itemsContainer.classList.remove("wait-response");

            this.updateVariables();

            if (openSideCart) {
              this.openSideCart();
            }

            window.PubSub.publish('update-main-cart')
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
            this.dataset.cartJson = JSON.stringify(response)
            window.PubSub.publish("update-header-cart-counter", response);
          });
      };

      playLoader = () => {
        this.loader.classList.add("js-loading");
      };

      stopLoader = () => {
        this.loader.classList.remove("js-loading");
      };
    }
  );
}
