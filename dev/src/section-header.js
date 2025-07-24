if (!customElements.get("s-header")) {
  customElements.define(
    "s-header",
    class Header extends HTMLElement {
      constructor() {
        super();

        this.activeMenu = null;
      }

      connectedCallback() {
        this.gtmAnalyticPageEvent()

        if (window.location.href.includes("?sales_channel=venn_apps")) {
          this.classList.add('is-hidden-venn-app')
        } else {
          this.monogram = this.querySelector(".s-header__monogram");
          this.logo = this.querySelector(".js-header__logo");
          this.lastScrollTop = 0;

          this.cartCounter = this.querySelector(".js-header__cart-count");
          this.wishlistCounter = this.querySelector(".js-header__wishlist-count");
          this.menuOpenerMobile = this.querySelector(".js-header__menu-button-mobile");
          this.menuOpenerDesktop = this.querySelector(".js-header__menu-button-desktop");
          this.searchButtons = this.querySelectorAll(".js-header__search-button");
          this.cartButton = this.querySelector(".js-header__cart-button");
          this.accountButton = this.querySelector(".js-header__account-button");

          this.menuOpenerMobile.addEventListener("click", this.openMenuMobile);
          this.menuOpenerDesktop.addEventListener("mouseover", this.openMenuDesktop);
          this.searchButtons.forEach((button) => button.addEventListener("click", this.openSearch));
          this.cartButton.addEventListener("click", this.openSideCart);
          this.accountButton?.addEventListener("click", this.openLoginModal);

          this.updateCartCounterUnsubscriber = window.PubSub.subscribe("update-header-cart-counter", this.updateCartCounter);
          this.cartUpdatedUnsubscriber = window.PubSub.subscribe("cart-updated", this.cartUpdated);
          this.loadWishlistCounterUnsubscriber = window.PubSub.subscribe("wishlist-loaded", (data) => {
            this.updateHeaderWishlistCount(data.listcontents);
          });
          this.addOneWishlistCounterUnsubscriber = window.PubSub.subscribe("wishlist-add-product", () => {
            this.addOneHeaderWishlistCount();
          });
          this.removeOneWishlistCounterUnsubscriber = window.PubSub.subscribe("wishlist-remove-product", () => {
            this.removeOneHeaderWishlistCount();
          });

          this.updateCartCounter();

          window.addEventListener("scroll", this.handleScroll);

          this.handleScroll();
        }
      }

      disconnectedCallback() {
        this.updateCartCounterUnsubscriber();
        this.cartUpdatedUnsubscriber();
        this.loadWishlistCounterUnsubscriber();
        this.addOneWishlistCounterUnsubscriber();
        this.removeOneWishlistCounterUnsubscriber();
        window.removeEventListener("scroll", this.handleScroll);
        this.menuOpenerMobile.removeEventListener("click", this.openMenuMobile);
        this.menuOpenerDesktop.removeEventListener("mouseover", this.openMenuDesktop);
        this.searchButtons.forEach((button) => button.removeEventListener("click", this.openSearch));
        this.cartButton.removeEventListener("click", this.openSideCart);
        this.accountButton.removeEventListener("click", this.openLoginModal);
      }

      gtmAnalyticPageEvent = () => {
        window.PubSub.publish('gtm_page_view')
      }

      handleScroll = () => {
        let st = window.pageYOffset || document.documentElement.scrollTop;
        const announcementBar = document.querySelector(".s-announcement-bar");
        const announcementBarHeight = announcementBar ? announcementBar.offsetHeight : 0;
        const headerHeight = this.offsetHeight;
        const totalOffset = announcementBarHeight + headerHeight;

        const isStandardPage = this.classList.contains("s-header__standard-page");

        if (st === 0) {
          this.style.top = `${announcementBarHeight}px`;
        } else {
          if (st > announcementBarHeight) {
            this.removeAttribute("style");
            this.classList.remove("transition-disable");
          } else {
            this.style.top = `${announcementBarHeight - st}px`;
            this.classList.add("transition-disable");
          }

          if (isStandardPage) {
            if (st > totalOffset) {
              if (st > this.lastScrollTop) {
                // scrolling down
                this.classList.add("hide");
              } else {
                // scrolling up
                this.classList.remove("hide");
              }
            } else {
              this.classList.remove("hide");
            }
          } else {
            if (st > this.lastScrollTop) {
              this.classList.add("hide");
            } else {
              this.classList.remove("hide");
            }
          }
        }

        if (st > 100) {
          this.logo.classList.add("hide");
          this.monogram.classList.add("show");
          this.classList.add("bg-filled");
        } else {
          this.logo.classList.remove("hide");
          this.monogram.classList.remove("show");
          this.classList.remove("bg-filled");
        }

        this.lastScrollTop = st <= 0 ? 0 : st;
      };

      updateCartCounter = () => {
        fetch(window.Shopify.routes.root + "cart.js", {
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((cart) => cart.json())
          .then((cart) => {
            this.cartUpdated(cart);
          });
      };

      cartUpdated = (cart) => {
        this.cartCounter.textContent = cart.item_count;
        if (cart.item_count > 0) {
          this.cartCounter.classList.add("is-active");
        } else {
          this.cartCounter.classList.remove("is-active");
        }
      };

      updateHeaderWishlistCount = (data) => {
        if (data?.length > 0) {
          this.wishlistCounter.classList.add("is-active");
        }

        this.wishlistCounter.setAttribute("data-count", data.length);
        this.wishlistCounter.innerHTML = data.length;
      };

      addOneHeaderWishlistCount = () => {
        const wishlistCount = +this.wishlistCounter.dataset.count + 1;

        this.wishlistCounter.setAttribute("data-count", wishlistCount);
        this.wishlistCounter.innerHTML = wishlistCount;

        if (wishlistCount > 0) {
          this.wishlistCounter.classList.add("is-active");
        }
      };

      removeOneHeaderWishlistCount = () => {
        const wishlistCount = +this.wishlistCounter.dataset.count - 1;

        this.wishlistCounter.setAttribute("data-count", wishlistCount);
        this.wishlistCounter.innerHTML = wishlistCount;

        if (wishlistCount <= 0) {
          this.wishlistCounter.classList.remove("is-active");
        }
      };

      openSideCart = () => {
        window.PubSub.publish("open-side-cart");
      };

      openSearch = () => {
        window.PubSub.publish("open-modal-search");
      };

      openMenuMobile = () => {
        window.PubSub.publish("open-mobile-menu");
      };

      openMenuDesktop = () => {
        window.PubSub.publish("open-mega-menu");
      };

      openLoginModal = () => {
        window.PubSub.publish("open-login");
      };
    }
  );
}
