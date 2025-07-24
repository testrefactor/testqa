if (!customElements.get("c-wishlist-button")) {
  customElements.define(
    "c-wishlist-button",
    class extends HTMLElement {
      constructor() {
        super();

        this.epi = this.dataset.epi;
        this.empi = this.dataset.empi;
        this.du = this.dataset.du;
        this.inList = false;
        this.product_handle = this.dataset.handle;
      }

      connectedCallback() {
        this.button = this.querySelector(".js-wishlist-button__button");

        this.updatedWishlistUnsubscriber = window.PubSub.subscribe("updated-wishlist", (data) => {
          this.wishlist = data.wishlist;

          if (data.empi == this.empi) {
            this.updateStatus(data.action);
          }
        });

        this.button.addEventListener("click", this.wishlistButtonClickHandler);

        this.wishlistLoadedUnsubscriber = window.PubSub.subscribe("wishlist-loaded", (list) => {
          for (const item of list.listcontents) {
            if (item.epi === +this.dataset.epi && item.empi === +this.dataset.empi) {
              this.inWishlist = true;
              break;
            }
          }
          this.updateWishlistButton();
        });

        this.wishlistAddUnsubscriber = window.PubSub.subscribe("wishlist-add-product", (product) => {
          if (+product.epi === +this.dataset.epi && +product.empi === +this.dataset.empi) {
            this.inWishlist = true;
            this.updateWishlistButton();
          }
        });

        this.wishlistRemoveUnsubscriber = window.PubSub.subscribe("wishlist-remove-product", (product) => {
          if (+product.epi === +this.dataset.epi && +product.empi === +this.dataset.empi) {
            this.inWishlist = false;
            this.updateWishlistButton();
          }
        });
      }

      disconnectedCallback() {
        this.wishlistLoadedUnsubscriber();
        this.wishlistAddUnsubscriber();
        this.wishlistRemoveUnsubscriber();
        this.updatedWishlistUnsubscriber();
        this.button.removeEventListener("click", this.wishlistButtonClickHandler);
      }

      containsInList = async () => {
        let contain = false;

        this.wishlist.listcontents.forEach((item) => {
          if (item.epi == this.epi && item.empi == this.empi) {
            this.setAction("delete");
            this.button.classList.add("added-to-wishlist");
            this.button.classList.remove("removed-from-wishlist");
            contain = true;
          }
        });

        if (!contain) {
          this.button.classList.remove("added-to-wishlist");
          this.button.classList.add("removed-from-wishlist");
          this.setAction("add");
          return false;
        }

        return contain;
      };

      updateStatus = (action) => {
        if (action === "add") {
          this.setAction("delete");
          this.button.classList.add("added-to-wishlist");
          this.button.classList.remove("removed-from-wishlist");
        } else {
          this.setAction("add");
          this.button.classList.remove("added-to-wishlist");
          this.button.classList.add("removed-from-wishlist");
        }
      };

      setAction(action = "add") {
        if (action === "delete") {
          this.inList = true;
          this.button.dataset.action = "delete";
        } else {
          this.inList = false;
          this.button.dataset.action = "add";
          this.button.classList.remove("added-to-wishlist");
          this.button.classList.add("removed-from-wishlist");
        }
      }

      wishlistButtonClickHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (!window.SwymCallbacks) {
          window.SwymCallbacks = [];
        }

        if (!this.inWishlist) {
          this.gtmAnalyticWishlistEvent();
          window.SwymCallbacks.push(this.addToWishlist);
        } else {
          window.SwymCallbacks.push(this.removeFromWishlist);
        }
      };

      addToWishlist = (swat) => {
        // Define the product object
        const product = {
          epi: this.dataset.epi, // Unique variant ID of the product
          empi: this.dataset.empi, // Master Product Id of the product
          du: this.dataset.du, // Product URL
        };

        // Define success callback
        let onSuccessAdd = (addedListItem) => {
          // Success response is the added product.
          this.inWishlist = true;
          this.updateWishlistButton();

          window.PubSub.publish("wishlist-add-product", product);
        };

        // Define error callback
        let onErrorAdd = (error) => {
          // Error is an xhrObj
          console.error("Error while adding the Product to the List", error);
        };

        // Call `addToList` with the above callbacks, lid and product object
        swat.addToList(window.apps.wishlist.listId, product, onSuccessAdd, onErrorAdd);
      };

      updateWishlistButton = () => {
        if (this.inWishlist) {
          this.button?.classList.add("added-to-wishlist");
        } else {
          this.button?.classList.remove("added-to-wishlist");
        }
      };

      removeFromWishlist = (swat) => {
        // Define the product object
        const product = {
          epi: this.dataset.epi, // Unique variant ID of the product
          empi: this.dataset.empi, // Master Product Id of the product
          du: this.dataset.du, // Product URL
        };

        // Define success callback
        let onSuccessRemove = (deletedProduct, data, data2, data3) => {
          // Success response is the removed product.
          this.inWishlist = false;
          this.updateWishlistButton();

          window.PubSub.publish("wishlist-remove-product", product);
        };

        // Define error callback
        let onErrorRemove = (error) => {
          // Error is an xhrObj
          console.error("Error while deleting the Product", error);
        };

        // Call `deleteFromList` with the above callbacks, lid and product object
        swat.deleteFromList(window.apps.wishlist.listId, product, onSuccessRemove, onErrorRemove);
      };

      gtmAnalyticWishlistEvent = () => {
        const productObject = JSON.parse(this.dataset.productJson);

        // 'temp-data' until further notice
        const data = {
          currency: window.Shopify.currency.active,
          items: [productObject],
        };

        window.PubSub.publish("gtm_add_to_wishlist", data);
      };
    }
  );
}
